// 埋め込み時にPythonで使用した終端マーカーと同じものを設定
const DELIMITER = "###END###"; 
const MAX_MESSAGE_SIZE = 10000; // 読み取りを途中で打ち切るための最大文字数（安全のため）

function decodeImage() {
    const fileInput = document.getElementById('imageUpload');
    const resultElement = document.getElementById('resultMessage');
    const statusElement = document.getElementById('statusMessage');
    
    // エラーチェック
    if (fileInput.files.length === 0) {
        resultElement.innerHTML = "❌ ファイルを選択してください。";
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    statusElement.innerText = "ファイルを読み込み中...";

    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            try {
                // Canvasに画像をロードし、ピクセルデータを取得
                const canvas = document.getElementById('hiddenCanvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
                
                statusElement.innerText = "LSBを抽出し、デコード中...";
                
                // --- LSBデコード処理 ---
                let binaryMessage = '';
                
                // RGBAの各ピクセルデータ配列をループ
                for (let i = 0; i < imageData.length; i++) {
                    // アルファチャネル (i+3) はスキップし、R, G, B (i, i+1, i+2) のみ処理
                    if ((i + 1) % 4 !== 0) { 
                        // LSB (最下位ビット) を抽出
                        // 例: 255 (11111111) & 1 = 1
                        // 例: 254 (11111110) & 1 = 0
                        binaryMessage += (imageData[i] & 1).toString();
                    }
                    
                    // 安全のためのチェック：メッセージの最大容量を超えないようにする
                    if (binaryMessage.length > MAX_MESSAGE_SIZE * 8) break; 
                }
                
                // --- バイナリからテキストへの変換 (日本語対応のコア部分) ---
                
                const bytes = [];
                for (let i = 0; i < binaryMessage.length; i += 8) {
                    const byte = binaryMessage.substring(i, i + 8);
                    if (byte.length === 8) {
                        bytes.push(parseInt(byte, 2));
                    }
                }
                
                // バイト配列をTypedArray (Uint8Array) に変換
                const uint8Array = new Uint8Array(bytes);

                // TextDecoderを使ってUTF-8文字列に変換
                // これが日本語（マルチバイト文字）を正しく復元する鍵です
                const decoder = new TextDecoder('utf-8');
                let decodedText = decoder.decode(uint8Array);

                // --- メッセージの抽出 ---
                let secretMessage = "❌ エラー: 終端マーカーが見つかりません。";
                
                if (decodedText.includes(DELIMITER)) {
                    secretMessage = decodedText.split(DELIMITER)[0];
                    statusElement.innerText = "デコード成功！";
                } else {
                    statusElement.innerText = "デコード失敗。マーカーが見つかりません。";
                }

                resultElement.innerHTML = secretMessage;

            } catch (error) {
                resultElement.innerHTML = `致命的なエラーが発生しました: ${error.message}`;
                statusElement.innerText = "処理失敗。";
            }
        };

        // 画像の読み込み
        img.src = event.target.result;
    };
    
    // ファイルリーダーでファイルをデータURLとして読み込む
    reader.readAsDataURL(file);
}

// ユーザーがファイルをアップロードしたときにすぐに処理を開始する
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('imageUpload').addEventListener('change', () => {
        document.getElementById('resultMessage').innerHTML = "ファイルが選択されました。デコードボタンを押してください。";
    });
});