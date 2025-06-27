import { ButtonPack } from "~/interfaces/IDiscord";
import itoCancelButton from "./ItoCancelButton";
import itoForceEndButton from "./ItoForceEndButton";
import itoJoinButton from "./ItoJoinButton";
import itoLeaveButton from "./ItoLeaveButton";
import itoPlayButton from "./ItoPlayButton";
import itoStartButton from "./ItoStartButton";
import showModalButton from "./ShowModalButton";

// ボタンを登録する
const buttons: ButtonPack[] = [
    showModalButton,
    itoJoinButton,
    itoLeaveButton,
    itoCancelButton,
    itoStartButton,
    itoPlayButton,
    itoForceEndButton,
];

export default buttons;
