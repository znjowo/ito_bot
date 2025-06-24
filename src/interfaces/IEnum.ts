/* eslint-disable no-unused-vars */

// カスタムID
export enum CustomIds {
    CommandTestSendMessage = "command_test_send_message", // メッセージ送信コマンド
    CommandTestShowModal = "command_test_show_modal", // モーダル表示コマンド

    SubCommandTestSendMessage = "subcommand_test_send_message", // メッセージ送信サブコマンド
    SubCommandTestShowModal = "subcommand_test_show_modal", // モーダル表示サブコマンド

    ButtonTestSendMessage = "button_test_send_message", // メッセージ送信ボタン
    ButtonTestShowModal = "button_test_show_modal", // モーダル表示ボタン

    ModalTest = "modal_test", // モーダル
    ModalInputTest = "modal_input_test", // モーダル入力

    // itoゲーム用
    ItoJoin = "ito_join_", // 参加ボタン
    ItoStart = "ito_start_", // 開始ボタン
    ItoPlay = "ito_play_", // カード提示ボタン
    ItoForceEnd = "ito_force_end", // 強制終了ボタン
}
