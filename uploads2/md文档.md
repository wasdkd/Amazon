md文档

### 1、图片测试

![1724910801312](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\1724910801312.png) 

### 2、代码测试

```python
import pandas as pd
from pandas import to_datetime


def calculate_period_auto(date):
    # 将日期转换为 datetime 对象
    date = to_datetime(date)

    # 找到本周的星期一
    if date.weekday() == 0:  # 如果是星期一
        period_start = date
    else:
        period_start = date - pd.Timedelta(days=date.weekday())

    # 周期的结束是星期日
    period_end = period_start + pd.Timedelta(days=6)

    return f"{period_start.strftime('%Y/%m/%d')} - {period_end.strftime('%Y/%m/%d')}"


# 测试函数
data1 = calculate_period_auto('2024-07-15')
print("周一到周日的日期范围:", data1)

def calculate_period_auto_weekdays(date):
    # 将日期转换为 datetime 对象
    date = to_datetime(date)

    # 找到本周的星期一
    if date.weekday() == 0:  # 如果是星期一
        period_start = date
    else:
        period_start = date - pd.Timedelta(days=date.weekday())

    # 周期的结束是星期六
    period_end = period_start + pd.Timedelta(days=5)

    return f"{period_start.strftime('%Y/%m/%d')} - {period_end.strftime('%Y/%m/%d')}"


# 测试函数
data2 = calculate_period_auto_weekdays('2024-07-29')
print("周一到周六的日期范围:", data2)

```

