import {
    action,
    computed,
    makeObservable,
    observable,
    runInAction,
} from "mobx";
import type { Client, API } from "revolt.js";
import { ulid } from "ulid";

import Changelog from "./components/Changelog";
import MFAEnableTOTP from "./components/MFAEnableTOTP";
import MFAFlow from "./components/MFAFlow";
import MFARecovery from "./components/MFARecovery";
import OutOfDate from "./components/OutOfDate";
import Test from "./components/Test";
import { Modal } from "./types";

type Components = Record<string, React.FC<any>>;

/**
 * Handles layering and displaying modals to the user.
 */
class ModalController<T extends Modal> {
    stack: T[] = [];
    components: Components;

    constructor(components: Components) {
        this.components = components;

        makeObservable(this, {
            stack: observable,
            push: action,
            remove: action,
            rendered: computed,
        });
    }

    /**
     * Display a new modal on the stack
     * @param modal Modal data
     */
    push(modal: T) {
        this.stack = [
            ...this.stack,
            {
                ...modal,
                key: ulid(),
            },
        ];
    }

    /**
     * Remove the keyed modal from the stack
     */
    remove(key: string) {
        this.stack = this.stack.filter((x) => x.key !== key);
    }

    /**
     * Render modals
     */
    get rendered() {
        return (
            <>
                {this.stack.map((modal) => {
                    const Component = this.components[modal.type];
                    return (
                        <Component
                            {...modal}
                            onClose={() => this.remove(modal.key!)}
                        />
                    );
                })}
            </>
        );
    }
}

/**
 * Modal controller with additional helpers.
 */
class ModalControllerExtended extends ModalController<Modal> {
    /**
     * Perform MFA flow
     * @param client Client
     */
    mfaFlow(client: Client) {
        return runInAction(
            () =>
                new Promise((callback: (ticket?: API.MFATicket) => void) =>
                    this.push({
                        type: "mfa_flow",
                        state: "known",
                        client,
                        callback,
                    }),
                ),
        );
    }

    /**
     * Open TOTP secret modal
     * @param client Client
     */
    mfaEnableTOTP(secret: string, identifier: string) {
        return runInAction(
            () =>
                new Promise((callback: (value?: string) => void) =>
                    this.push({
                        type: "mfa_enable_totp",
                        identifier,
                        secret,
                        callback,
                    }),
                ),
        );
    }
}

export const modalController = new ModalControllerExtended({
    changelog: Changelog,
    mfa_flow: MFAFlow,
    mfa_recovery: MFARecovery,
    mfa_enable_totp: MFAEnableTOTP,
    out_of_date: OutOfDate,
    test: Test,
});
