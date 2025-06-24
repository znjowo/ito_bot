import { ButtonPack } from "~/interfaces/IDiscord";
import showModalButton from "./ShowModalButton";
import testButton from "./TestButton";

// ボタンを登録する
const buttons: ButtonPack[] = [testButton, showModalButton];

export default buttons;
