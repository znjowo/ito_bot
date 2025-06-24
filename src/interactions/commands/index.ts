import { CommandPack } from "~/interfaces/IDiscord";
import showModalCommand from "./ShowModalCommand";
import testCommand from "./TestCommand";

// コマンドを登録する
const commands: CommandPack[] = [testCommand, showModalCommand];

export default commands;
