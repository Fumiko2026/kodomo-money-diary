"""項目の色。キー名だけをここで持つ。実際の色の値は、フロントの CSS の変数に置く。

自由な色にすると、読みにくい色を選べてしまうため、用意した 8 色から選ばせる(docs/screens.md S8)。
"""

from typing import Literal

ColorKey = Literal[
    "red1", "orange1", "yellow1", "green1", "blue1", "purple1", "pink1", "gray1"
]
