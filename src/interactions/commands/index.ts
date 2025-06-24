import { CommandPack } from "~/interfaces/IDiscord";
import itoCommand from "./ItoCommand";
import showModalCommand from "./ShowModalCommand";
import testCommand from "./TestCommand";

// コマンドを登録する
const commands: CommandPack[] = [testCommand, showModalCommand, itoCommand];

export default commands;
