import { ModalPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class TestModal extends BaseInteractionManager<any> {
    protected async main(): Promise<void> {
        const input = this.interaction.fields.getTextInputValue(
            CustomIds.ModalInputTest
        );
        await this.sendTestMessage(`モーダルから送信された内容: ${input}`);
    }
}

const testModal: ModalPack = {
    id: CustomIds.ModalTest,
    instance: instance(TestModal),
};

export default testModal;
