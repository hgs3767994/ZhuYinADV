# 嘴型手動調校工具

入口：`tools/mouth-calibrator/index.html`

- 固定使用臉型 1（圓臉）作為共同調校基準。
- 保留嘴型：`01、02、04、05、06、07、08、10、14`。
- 可分別調整水平縮放、垂直縮放、左右位置 X 與上下位置 Y。
- 支援滑桿、數字輸入、畫布拖曳及方向鍵微調；按住 Shift 時方向鍵每次移動 5px。
- 每款嘴型使用獨立 `localStorage` 鍵：`zhuyin-mouthXX-round-transform-calibration-v1`。
- 匯出的縮放比例與相對位置共同套用至所有臉型。
- 可複製或下載 `mouth-face-calibration.json`。

本工具使用候選素材，不代表嘴型已正式加入程式或完成部署。
