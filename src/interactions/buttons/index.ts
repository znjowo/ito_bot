import { ButtonPack } from "~/interfaces/IDiscord";
import itoForceEndButton from "./ItoForceEndButton";
import itoJoinButton from "./ItoJoinButton";
import itoPlayButton from "./ItoPlayButton";
import itoStartButton from "./ItoStartButton";
import showModalButton from "./ShowModalButton";
import testButton from "./TestButton";

// ボタンを登録する
const buttons: ButtonPack[] = [
    testButton,
    showModalButton,
    itoJoinButton,
    itoStartButton,
    itoPlayButton,
    itoForceEndButton,
];

export default buttons;
