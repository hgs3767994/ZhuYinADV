# 等級動物素材切分工具

將 5×2 排列的等級動物 JPG 原圖切成十張 256×256 透明 PNG。工具會依每列實際前景自動辨識五個水平群組，不依賴聊天預覽尺寸或不規則的左右留白。

工具以各格邊界為起點，只移除與外部連通的白色／近白色背景，再針對白底混色的邊緣像素做透明度與顏色還原。因此兔子、綿羊等角色外框內的白色區域會保留。

```powershell
node tools/rank-animals/split-rank-animals.mjs `
  "C:\path\to\等級動物頭像.jpg" `
  "public\assets\images\ranks"
```
