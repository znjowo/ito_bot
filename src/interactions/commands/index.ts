import { CommandPack } from "~/interfaces/IDiscord";
import changeTopicCommand from "./ChangeTopicCommand";
import itoCommand from "./ItoCommand";
import showModalCommand from "./ShowModalCommand";
import testCommand from "./TestCommand";

// コマンドを登録する
const commands: CommandPack[] = [
    testCommand,
    showModalCommand,
    itoCommand,
    changeTopicCommand,
];

export default commands;
