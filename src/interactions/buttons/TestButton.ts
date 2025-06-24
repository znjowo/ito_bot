import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class TestButton extends BaseInteractionManager<any> {
    protected async main(): Promise<void> {
        await this.sendTestMessage("テストボタンがクリックされました！");
    }
}

const testButton: ButtonPack = {
    id: CustomIds.ButtonTestSendMessage,
    instance: instance(TestButton),
};

export default testButton;
