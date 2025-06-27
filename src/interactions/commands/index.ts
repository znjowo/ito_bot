import { CommandPack } from "~/interfaces/IDiscord";
import changeTopicCommand from "./ChangeTopicCommand";
import itoCommand from "./ItoCommand";
import showModalCommand from "./ShowModalCommand";

// コマンドを登録する
const commands: CommandPack[] = [
    showModalCommand,
    itoCommand,
    changeTopicCommand,
];

export default commands;
