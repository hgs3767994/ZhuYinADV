# 鼻型手動縮放調校工具

入口：`tools/nose-calibrator/index.html`

- 固定使用臉型 1（圓臉）作為共同調校基準。
- 允許水平、垂直縮放及上下位置 Y 調整；水平中心固定，不提供拖曳、方向鍵或水平座標調整。
- 每款鼻型使用獨立 `localStorage` 鍵：`zhuyin-noseXX-round-scale-calibration-v1`。
- 鼻型主體以遮罩填入目前膚色，細節層保留輪廓、鼻孔、陰影與高光。
- 匯出的縮放比例共同套用到所有臉型。
- 可匯出 `nose-face-calibration.json`。

本工具使用候選素材，不代表鼻型已正式加入程式或完成部署。
