import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ShowModalButton extends BaseInteractionManager<any> {
    protected async main(): Promise<void> {
        await this.showTestModal();
    }
}

const showModalButton: ButtonPack = {
    id: CustomIds.ButtonTestShowModal,
    instance: instance(ShowModalButton),
};

export default showModalButton;
