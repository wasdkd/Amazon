import type {
  JourneyData,
  JourneyMilestone,
  LiveTelemetrySnapshot,
  ModeAdvisory,
  ModeComparisonItem,
  ProvinceNode,
  ProvinceWeather,
  RouteSegment,
  RouteWaypoint,
  TrafficLevel,
  TransportMode,
} from '../types/geo';

export const PROVINCE_NODES: ProvinceNode[] = [
  {
    adcode: 450000,
    name: '广西壮族自治区',
    shortName: '广西',
    hubCity: '南宁',
    coords: [108.32, 22.82],
    airportCode: 'NNG 吴圩',
    stationName: '南宁东站',
    highwayGate: 'G80 广昆高速南宁段',
    baseUsers: 18420,
    regionTag: '华南',
    weather: {
      condition: '多云转小雨',
      icon: 'rain',
      tempC: 24,
      windKmh: 16,
      humidity: 78,
      visibilityKm: 11,
      summary: '喀斯特山谷微风湿润，南部偶有阵雨',
    },
    trivia: '南宁老友粉热辣开胃，沿途经过桂东山地与西江水系，山水画卷徐徐展开。',
  },
  {
    adcode: 440000,
    name: '广东省',
    shortName: '广东',
    hubCity: '广州',
    coords: [113.28, 23.13],
    airportCode: 'CAN 白云',
    stationName: '广州南站',
    highwayGate: 'G80/G15 广佛高速',
    baseUsers: 46890,
    regionTag: '华南',
    weather: {
      condition: '晴间多云',
      icon: 'sun',
      tempC: 26,
      windKmh: 14,
      humidity: 68,
      visibilityKm: 18,
      summary: '珠江口东南风轻拂，能见度极佳',
    },
    trivia: '抵达岭南中心广州！沙面欧陆建筑与珠江新城天际线交汇，虾饺烧卖已就位。',
  },
  {
    adcode: 110000,
    name: '北京市',
    shortName: '北京',
    hubCity: '北京',
    coords: [116.41, 39.90],
    airportCode: 'PEK/PKX',
    stationName: '北京南站',
    highwayGate: 'G2 京沪高速主站',
    baseUsers: 39240,
    regionTag: '华北',
    weather: {
      condition: '晴朗微风',
      icon: 'sun',
      tempC: 11,
      windKmh: 19,
      humidity: 36,
      visibilityKm: 24,
      summary: '西北晴空通透，适宜高速巡航与起降',
    },
    trivia: '华北平原核心枢纽，中轴线古韵与高铁放射网在此交汇。',
  },
  {
    adcode: 310000,
    name: '上海市',
    shortName: '上海',
    hubCity: '上海',
    coords: [121.47, 31.23],
    airportCode: 'PVG/SHA',
    stationName: '上海虹桥站',
    highwayGate: 'G2/G50 沪渝立交',
    baseUsers: 41650,
    regionTag: '华东',
    weather: {
      condition: '疏云微风',
      icon: 'cloud',
      tempC: 17,
      windKmh: 21,
      humidity: 62,
      visibilityKm: 16,
      summary: '东海海风拂过浦江，虹桥枢纽客流密集',
    },
    trivia: '长三角立体交通心脏，虹桥综合枢纽实现空铁无缝换乘。',
  },
  {
    adcode: 330000,
    name: '浙江省',
    shortName: '浙江',
    hubCity: '杭州',
    coords: [120.15, 30.29],
    airportCode: 'HGH 萧山',
    stationName: '杭州东站',
    highwayGate: 'G60 沪昆高速',
    baseUsers: 31800,
    regionTag: '华东',
    weather: {
      condition: '晴转多云',
      icon: 'sun',
      tempC: 18,
      windKmh: 12,
      humidity: 58,
      visibilityKm: 19,
      summary: '西湖微风和煦，杭甬线通行顺畅',
    },
    trivia: '江南数字经济高地，龙井茶香与钱塘江潮相映成趣。',
  },
  {
    adcode: 320000,
    name: '江苏省',
    shortName: '江苏',
    hubCity: '南京',
    coords: [118.77, 32.04],
    airportCode: 'NKG 禄口',
    stationName: '南京南站',
    highwayGate: 'G42 沪蓉高速',
    baseUsers: 34210,
    regionTag: '华东',
    weather: {
      condition: '多云',
      icon: 'cloud',
      tempC: 16,
      windKmh: 15,
      humidity: 55,
      visibilityKm: 17,
      summary: '长江下游气候温和，跨江大桥风速平稳',
    },
    trivia: '六朝古都坐拥亚洲领先的高铁枢纽站，长江大桥跨南北通途。',
  },
  {
    adcode: 510000,
    name: '四川省',
    shortName: '四川',
    hubCity: '成都',
    coords: [104.07, 30.66],
    airportCode: 'TFU/CTU',
    stationName: '成都东站',
    highwayGate: 'G76 厦蓉高速',
    baseUsers: 29850,
    regionTag: '西南',
    weather: {
      condition: '薄雾阴天',
      icon: 'fog',
      tempC: 16,
      windKmh: 8,
      humidity: 81,
      visibilityKm: 7,
      summary: '盆地晨间轻雾缭绕，双机场盲降保障正常',
    },
    trivia: '天府之国安逸惬意，出川高铁翻越秦岭大巴山，麻辣鲜香迎八方来客。',
  },
  {
    adcode: 500000,
    name: '重庆市',
    shortName: '重庆',
    hubCity: '重庆',
    coords: [106.50, 29.53],
    airportCode: 'CKG 江北',
    stationName: '重庆北站',
    highwayGate: 'G85 银昆高速',
    baseUsers: 23410,
    regionTag: '西南',
    weather: {
      condition: '小雨微凉',
      icon: 'rain',
      tempC: 17,
      windKmh: 10,
      humidity: 84,
      visibilityKm: 9,
      summary: '两江交汇烟雨朦胧，桥梁匝道注意缓行',
    },
    trivia: '8D魔幻山城！轻轨穿楼而过，成渝高铁1小时直达巴蜀双星。',
  },
  {
    adcode: 420000,
    name: '湖北省',
    shortName: '湖北',
    hubCity: '武汉',
    coords: [114.30, 30.58],
    airportCode: 'WUH 天河',
    stationName: '武汉站',
    highwayGate: 'G4 京港澳高速',
    baseUsers: 24980,
    regionTag: '华中',
    weather: {
      condition: '晴间多云',
      icon: 'sun',
      tempC: 18,
      windKmh: 13,
      humidity: 57,
      visibilityKm: 18,
      summary: '江城视野开阔，九省通衢路网全线畅通',
    },
    trivia: '九省通衢大武汉，一碗热干面开启穿越大江大湖的极速旅程。',
  },
  {
    adcode: 430000,
    name: '湖南省',
    shortName: '湖南',
    hubCity: '长沙',
    coords: [112.98, 28.19],
    airportCode: 'CSX 黄花',
    stationName: '长沙南站',
    highwayGate: 'G4/G60 枢纽互通',
    baseUsers: 22340,
    regionTag: '华中',
    weather: {
      condition: '阵雨转晴',
      icon: 'rain',
      tempC: 20,
      windKmh: 15,
      humidity: 74,
      visibilityKm: 13,
      summary: '湘江流域雨后初晴，湿度偏高但路面渐干',
    },
    trivia: '星城长沙烟火气十足，茶颜悦色与橘子洲头是无数旅人的打卡坐标。',
  },
  {
    adcode: 610000,
    name: '陕西省',
    shortName: '陕西',
    hubCity: '西安',
    coords: [108.95, 34.26],
    airportCode: 'XIY 咸阳',
    stationName: '西安北站',
    highwayGate: 'G30 连霍高速',
    baseUsers: 20120,
    regionTag: '西北',
    weather: {
      condition: '秋高气爽',
      icon: 'sun',
      tempC: 13,
      windKmh: 14,
      humidity: 42,
      visibilityKm: 22,
      summary: '关中平原干燥晴朗，航路气象条件优异',
    },
    trivia: '十三朝古都长安，肉夹馍配冰峰，跨过秦岭便入蜀道青天。',
  },
  {
    adcode: 350000,
    name: '福建省',
    shortName: '福建',
    hubCity: '福州',
    coords: [119.31, 26.08],
    airportCode: 'FOC 长乐',
    stationName: '福州南站',
    highwayGate: 'G15 沈海高速',
    baseUsers: 19640,
    regionTag: '华东',
    weather: {
      condition: '海风阵风',
      icon: 'wind',
      tempC: 22,
      windKmh: 28,
      humidity: 71,
      visibilityKm: 15,
      summary: '东南沿海风力稍强，跨海大桥侧风需留意',
    },
    trivia: '福厦高铁贴海飞驰，一边是闽中山峦翠绿，一边是海峡碧波万顷。',
  },
  {
    adcode: 370000,
    name: '山东省',
    shortName: '山东',
    hubCity: '济南',
    coords: [117.00, 36.68],
    airportCode: 'TNA 遥墙',
    stationName: '济南西站',
    highwayGate: 'G3 京台高速',
    baseUsers: 25760,
    regionTag: '华东',
    weather: {
      condition: '晴朗',
      icon: 'sun',
      tempC: 14,
      windKmh: 18,
      humidity: 44,
      visibilityKm: 21,
      summary: '齐鲁大地晴空万里，高速路网运行平稳',
    },
    trivia: '泉城济南水脉纵横，济青高铁串联泰山灵秀与渤海湾风光。',
  },
  {
    adcode: 410000,
    name: '河南省',
    shortName: '河南',
    hubCity: '郑州',
    coords: [113.67, 34.76],
    airportCode: 'CGO 新郑',
    stationName: '郑州东站',
    highwayGate: 'G4/G30 十字枢纽',
    baseUsers: 26390,
    regionTag: '华中',
    weather: {
      condition: '多云',
      icon: 'cloud',
      tempC: 15,
      windKmh: 16,
      humidity: 49,
      visibilityKm: 18,
      summary: '中原腹地云层适中，米字形高铁网全速运转',
    },
    trivia: '郑州东站位居全国米字形高铁网圆心，四面八方高效分流。',
  },
  {
    adcode: 530000,
    name: '云南省',
    shortName: '云南',
    hubCity: '昆明',
    coords: [102.71, 25.04],
    airportCode: 'KMG 长水',
    stationName: '昆明南站',
    highwayGate: 'G80 广昆高速终点',
    baseUsers: 16480,
    regionTag: '西南',
    weather: {
      condition: '高原晴空',
      icon: 'sun',
      tempC: 19,
      windKmh: 14,
      humidity: 51,
      visibilityKm: 25,
      summary: '春城紫外线明媚，云贵高原紫外线较强注意防晒',
    },
    trivia: '四季如春的彩云之南，云桂高铁一路穿行世界级喀斯特峰林。',
  },
  {
    adcode: 520000,
    name: '贵州省',
    shortName: '贵州',
    hubCity: '贵阳',
    coords: [106.71, 26.58],
    airportCode: 'KWE 龙洞堡',
    stationName: '贵阳北站',
    highwayGate: 'G60 沪昆高速',
    baseUsers: 14290,
    regionTag: '西南',
    weather: {
      condition: '阴有零星小雨',
      icon: 'rain',
      tempC: 16,
      windKmh: 12,
      humidity: 82,
      visibilityKm: 10,
      summary: '喀斯特高架桥区水汽较浓，隧道群照明正常',
    },
    trivia: '贵广高铁穿山越谷，桥隧比超过80%，被誉为穿越喀斯特的超级工程。',
  },
  {
    adcode: 460000,
    name: '海南省',
    shortName: '海南',
    hubCity: '海口',
    coords: [110.33, 20.03],
    airportCode: 'HAK 美兰',
    stationName: '海口东站',
    highwayGate: 'G98 环岛高速',
    baseUsers: 11250,
    regionTag: '华南',
    weather: {
      condition: '热带海风',
      icon: 'sun',
      tempC: 27,
      windKmh: 22,
      humidity: 76,
      visibilityKm: 19,
      summary: '琼州海峡海风和畅，环岛旅游公路风景如画',
    },
    trivia: '全球唯一热带海岛环岛高铁所在地，椰风海韵四季常青。',
  },
  {
    adcode: 210000,
    name: '辽宁省',
    shortName: '辽宁',
    hubCity: '沈阳',
    coords: [123.43, 41.80],
    airportCode: 'SHE 桃仙',
    stationName: '沈阳北站',
    highwayGate: 'G1 京哈高速',
    baseUsers: 15820,
    regionTag: '东北',
    weather: {
      condition: '晴冷',
      icon: 'sun',
      tempC: 4,
      windKmh: 21,
      humidity: 39,
      visibilityKm: 20,
      summary: '辽东半岛晴朗清冽，路面干燥抓地力良好',
    },
    trivia: '东北亚门户枢纽，沈大高速与哈大高寒高铁见证老工业基地焕新。',
  },
  {
    adcode: 230000,
    name: '黑龙江省',
    shortName: '黑龙江',
    hubCity: '哈尔滨',
    coords: [126.64, 45.76],
    airportCode: 'HRB 太平',
    stationName: '哈尔滨西站',
    highwayGate: 'G10 绥满高速',
    baseUsers: 11960,
    regionTag: '东北',
    weather: {
      condition: '小雪微寒',
      icon: 'snow',
      tempC: -4,
      windKmh: 18,
      humidity: 66,
      visibilityKm: 9,
      summary: '松花江畔飘起初雪，高速部分路段需防暗冰',
    },
    trivia: '冰雪大世界与圣索菲亚教堂冬韵正浓，高寒动车组自带除冰黑科技。',
  },
  {
    adcode: 220000,
    name: '吉林省',
    shortName: '吉林',
    hubCity: '长春',
    coords: [125.32, 43.89],
    airportCode: 'CGQ 龙嘉',
    stationName: '长春站',
    highwayGate: 'G1 京哈高速长春段',
    baseUsers: 10340,
    regionTag: '东北',
    weather: {
      condition: '多云转晴',
      icon: 'cloud',
      tempC: 0,
      windKmh: 17,
      humidity: 52,
      visibilityKm: 16,
      summary: '东北中部干冷通透，长白山支线风力适中',
    },
    trivia: '中国高铁制造摇篮之一，众多复兴号列车由此驶向全国铁路网。',
  },
  {
    adcode: 120000,
    name: '天津市',
    shortName: '天津',
    hubCity: '天津',
    coords: [117.19, 39.13],
    airportCode: 'TSN 滨海',
    stationName: '天津西站',
    highwayGate: 'G2 京沪天津段',
    baseUsers: 15120,
    regionTag: '华北',
    weather: {
      condition: '晴间多云',
      icon: 'sun',
      tempC: 11,
      windKmh: 18,
      humidity: 41,
      visibilityKm: 20,
      summary: '海河沿岸阳光和煦，京津城际30分钟极速通勤',
    },
    trivia: '京津城际中国首条时速350公里高铁，海河之眼夜色迷人。',
  },
  {
    adcode: 130000,
    name: '河北省',
    shortName: '河北',
    hubCity: '石家庄',
    coords: [114.50, 38.05],
    airportCode: 'SJW 正定',
    stationName: '石家庄站',
    highwayGate: 'G4 京港澳高速',
    baseUsers: 19300,
    regionTag: '华北',
    weather: {
      condition: '晴',
      icon: 'sun',
      tempC: 12,
      windKmh: 15,
      humidity: 40,
      visibilityKm: 19,
      summary: '太行山麓风清气爽，京广干线畅通',
    },
    trivia: '雄安新区与京广走廊并行，燕赵大地连接华北与中原。',
  },
  {
    adcode: 140000,
    name: '山西省',
    shortName: '山西',
    hubCity: '太原',
    coords: [112.55, 37.86],
    airportCode: 'TYN 武宿',
    stationName: '太原南站',
    highwayGate: 'G5 京昆高速',
    baseUsers: 11840,
    regionTag: '华北',
    weather: {
      condition: '晴朗干燥',
      icon: 'sun',
      tempC: 10,
      windKmh: 16,
      humidity: 35,
      visibilityKm: 22,
      summary: '黄土高原东缘空气干爽，能见度极高',
    },
    trivia: '表里山河山西，穿越石太客专隧道群即抵三晋古建秘境。',
  },
  {
    adcode: 150000,
    name: '内蒙古自治区',
    shortName: '内蒙古',
    hubCity: '呼和浩特',
    coords: [111.67, 40.82],
    airportCode: 'HET 白塔',
    stationName: '呼和浩特东站',
    highwayGate: 'G6 京藏高速',
    baseUsers: 9850,
    regionTag: '华北',
    weather: {
      condition: '大风晴空',
      icon: 'wind',
      tempC: 6,
      windKmh: 31,
      humidity: 29,
      visibilityKm: 25,
      summary: '阴山南麓北风劲吹，高架路段注意横风',
    },
    trivia: '横跨东西两千余公里的壮丽草原走廊，京张高铁直抵塞外青城。',
  },
  {
    adcode: 340000,
    name: '安徽省',
    shortName: '安徽',
    hubCity: '合肥',
    coords: [117.28, 31.86],
    airportCode: 'HFE 新桥',
    stationName: '合肥南站',
    highwayGate: 'G40 沪陕高速',
    baseUsers: 18940,
    regionTag: '华东',
    weather: {
      condition: '多云',
      icon: 'cloud',
      tempC: 16,
      windKmh: 13,
      humidity: 58,
      visibilityKm: 17,
      summary: '江淮之间天气平稳，巢湖水汽轻柔',
    },
    trivia: '徽派建筑与科创之城交融，合肥已跃升长三角西翼重要高铁枢纽。',
  },
  {
    adcode: 360000,
    name: '江西省',
    shortName: '江西',
    hubCity: '南昌',
    coords: [115.89, 28.68],
    airportCode: 'KHN 昌北',
    stationName: '南昌西站',
    highwayGate: 'G60 沪昆高速',
    baseUsers: 15460,
    regionTag: '华东',
    weather: {
      condition: '阵雨转阴',
      icon: 'rain',
      tempC: 19,
      windKmh: 14,
      humidity: 76,
      visibilityKm: 12,
      summary: '鄱阳湖流域偶有细雨，昌赣线准点运行',
    },
    trivia: '物华天宝、人杰地灵，滕王阁下赣江流淌，瓦罐汤香气四溢。',
  },
  {
    adcode: 620000,
    name: '甘肃省',
    shortName: '甘肃',
    hubCity: '兰州',
    coords: [103.82, 36.06],
    airportCode: 'LHW 中川',
    stationName: '兰州西站',
    highwayGate: 'G30 连霍高速',
    baseUsers: 9640,
    regionTag: '西北',
    weather: {
      condition: '晴朗干燥',
      icon: 'sun',
      tempC: 9,
      windKmh: 15,
      humidity: 33,
      visibilityKm: 23,
      summary: '黄河穿城而过，河西走廊晴空万里',
    },
    trivia: '丝绸之路黄金段，一碗兰州牛肉面之后即可沿兰新高铁飞驰大漠。',
  },
  {
    adcode: 630000,
    name: '青海省',
    shortName: '青海',
    hubCity: '西宁',
    coords: [101.78, 36.62],
    airportCode: 'XNN 曹家堡',
    stationName: '西宁站',
    highwayGate: 'G6 京藏高速',
    baseUsers: 5180,
    regionTag: '西北',
    weather: {
      condition: '高原晴冷',
      icon: 'sun',
      tempC: 5,
      windKmh: 20,
      humidity: 31,
      visibilityKm: 28,
      summary: '高原空气稀薄澄澈，昼夜温差较大注意添衣',
    },
    trivia: '青藏高原门户，翻越达坂山便可见青海湖湛蓝如镜。',
  },
  {
    adcode: 640000,
    name: '宁夏回族自治区',
    shortName: '宁夏',
    hubCity: '银川',
    coords: [106.28, 38.47],
    airportCode: 'INC 河东',
    stationName: '银川站',
    highwayGate: 'G20 青银高速',
    baseUsers: 5420,
    regionTag: '西北',
    weather: {
      condition: '晴空微风',
      icon: 'sun',
      tempC: 8,
      windKmh: 14,
      humidity: 34,
      visibilityKm: 24,
      summary: '贺兰山下天高云淡，塞上江南气候宜人',
    },
    trivia: '塞上江南银川，左手黄河灌区绿洲，右手贺兰山苍茫晚霞。',
  },
  {
    adcode: 650000,
    name: '新疆维吾尔自治区',
    shortName: '新疆',
    hubCity: '乌鲁木齐',
    coords: [87.62, 43.79],
    airportCode: 'URC 地窝堡',
    stationName: '乌鲁木齐站',
    highwayGate: 'G30 连霍高速西端',
    baseUsers: 11240,
    regionTag: '西北',
    weather: {
      condition: '晴间微风',
      icon: 'wind',
      tempC: 6,
      windKmh: 26,
      humidity: 36,
      visibilityKm: 26,
      summary: '天山北麓风光壮阔，百里风区风力可控',
    },
    trivia: '广袤占国土六分之一的壮美疆域，空中航线与兰新高铁跨戈壁而行。',
  },
  {
    adcode: 540000,
    name: '西藏自治区',
    shortName: '西藏',
    hubCity: '拉萨',
    coords: [91.13, 29.66],
    airportCode: 'LXA 贡嘎',
    stationName: '拉萨站',
    highwayGate: 'G318/G4218 拉林段',
    baseUsers: 4890,
    regionTag: '西南',
    weather: {
      condition: '日光城晴空',
      icon: 'sun',
      tempC: 11,
      windKmh: 18,
      humidity: 26,
      visibilityKm: 30,
      summary: '日光城阳光充足、紫外线强，高海拔注意防晒补水',
    },
    trivia: '世界屋脊圣城拉萨，复兴号高原双源动车组已贯通拉林雪域线。',
  },
  {
    adcode: 810000,
    name: '香港特别行政区',
    shortName: '香港',
    hubCity: '香港',
    coords: [114.17, 22.32],
    airportCode: 'HKG 赤鱲角',
    stationName: '香港西九龙站',
    highwayGate: '港珠澳/深港通道',
    baseUsers: 14280,
    regionTag: '港澳台',
    weather: {
      condition: '晴伴海风',
      icon: 'sun',
      tempC: 25,
      windKmh: 19,
      humidity: 72,
      visibilityKm: 18,
      summary: '维多利亚港风清浪平，跨海通道运行顺畅',
    },
    trivia: '广深港高铁直达西九龙核心商圈，48分钟即可从广州南贯通维港。',
  },
  {
    adcode: 820000,
    name: '澳门特别行政区',
    shortName: '澳门',
    hubCity: '澳门',
    coords: [113.55, 22.20],
    airportCode: 'MFM 氹仔',
    stationName: '横琴口岸枢纽',
    highwayGate: '港珠澳大桥口岸',
    baseUsers: 5640,
    regionTag: '港澳台',
    weather: {
      condition: '晴间多云',
      icon: 'sun',
      tempC: 25,
      windKmh: 17,
      humidity: 73,
      visibilityKm: 17,
      summary: '伶仃洋大桥侧风温和，通关道路畅通',
    },
    trivia: '葡式碎石街与港珠澳大桥世纪工程相连，葡挞香气扑面而来。',
  },
  {
    adcode: 710000,
    name: '台湾省',
    shortName: '台湾',
    hubCity: '台北',
    coords: [121.51, 25.04],
    airportCode: 'TPE/TSA',
    stationName: '台北车站',
    highwayGate: '环岛高速公路网',
    baseUsers: 13750,
    regionTag: '港澳台',
    weather: {
      condition: '暖湿微雨',
      icon: 'rain',
      tempC: 23,
      windKmh: 20,
      humidity: 79,
      visibilityKm: 14,
      summary: '台北盆地东北季风带来阵雨，宜随身带伞',
    },
    trivia: '夜市小吃与环岛海岸线闻名，101大楼与纵贯高铁连接南北风光。',
  },
];

export const PROVINCE_BY_ADCODE = new Map<number, ProvinceNode>(
  PROVINCE_NODES.map((p) => [p.adcode, p])
);

export const PRESET_ROUTES: Array<{
  id: string;
  label: string;
  originAdcode: number;
  destAdcode: number;
  subtitle: string;
}> = [
  {
    id: 'gx-gd',
    label: '广西 → 广东',
    originAdcode: 450000,
    destAdcode: 440000,
    subtitle: '南广高铁 · 桂粤黄金走廊',
  },
  {
    id: 'bj-sh',
    label: '北京 → 上海',
    originAdcode: 110000,
    destAdcode: 310000,
    subtitle: '京沪动脉 · 极速双城记',
  },
  {
    id: 'sc-cq',
    label: '四川 → 重庆',
    originAdcode: 510000,
    destAdcode: 500000,
    subtitle: '成渝双城 · 巴蜀1小时圈',
  },
  {
    id: 'zj-fj',
    label: '浙江 → 福建',
    originAdcode: 330000,
    destAdcode: 350000,
    subtitle: '东南沿海 · 山海画廊',
  },
  {
    id: 'sn-xz',
    label: '陕西 → 西藏',
    originAdcode: 610000,
    destAdcode: 540000,
    subtitle: '跨越高原 · 长安至雪域',
  },
];

export const REGION_PRESETS: Array<{
  key: 'all' | 'guangxi_guangdong' | 'yangtze' | 'jingjinji' | 'chengyu';
  label: string;
  center: [number, number];
  scaleMultiplier: number;
}> = [
  { key: 'all', label: '全国视图', center: [104.5, 35.8], scaleMultiplier: 1.0 },
  { key: 'guangxi_guangdong', label: '桂粤走廊', center: [110.8, 22.9], scaleMultiplier: 3.8 },
  { key: 'yangtze', label: '长三角', center: [119.8, 31.2], scaleMultiplier: 3.6 },
  { key: 'jingjinji', label: '京津冀', center: [116.2, 39.2], scaleMultiplier: 3.9 },
  { key: 'chengyu', label: '成渝圈', center: [105.3, 30.1], scaleMultiplier: 3.8 },
];

// Great-circle distance in km
export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface CorridorWaypointDef {
  name: string;
  carName?: string;
  airName?: string;
  coords: [number, number];
  note: string;
}

// Curated intermediate corridor stations/waypoints for signature routes
const CURATED_CORRIDORS: Record<string, CorridorWaypointDef[]> = {
  '450000-440000': [
    {
      name: '贵港站',
      carName: '横州服务区',
      airName: '玉林导航台',
      coords: [109.60, 23.11],
      note: '穿过郁江平原，前方进入桂中荷城区间',
    },
    {
      name: '梧州南站',
      carName: '岑溪省界服务区',
      airName: '梧州高空报告点',
      coords: [111.27, 23.48],
      note: '桂东门户！即将跨入广东界，西江水系风光壮美',
    },
    {
      name: '肇庆东站',
      carName: '肇庆高要服务区',
      airName: '广佛进近走廊',
      coords: [112.66, 23.24],
      note: '跨过西江特大桥，远眺七星岩喀斯特湖景，广佛都市圈在望',
    },
  ],
  '440000-450000': [
    {
      name: '肇庆东站',
      carName: '肇庆高要服务区',
      airName: '肇庆离场走廊',
      coords: [112.66, 23.24],
      note: '驶出珠三角都市圈，沿西江山水画廊向西推进',
    },
    {
      name: '梧州南站',
      carName: '岑溪省界服务区',
      airName: '梧州高空报告点',
      coords: [111.27, 23.48],
      note: '跨入广西界！空气中带着桂东山林与茶香',
    },
    {
      name: '贵港站',
      carName: '横州服务区',
      airName: '南宁进近走廊',
      coords: [109.60, 23.11],
      note: '荷城贵港已过，距离终点南宁仅剩最后一程',
    },
  ],
  '110000-310000': [
    {
      name: '济南西站',
      carName: '济南槐荫服务区',
      airName: '济南高空航路点',
      coords: [116.89, 36.67],
      note: '横渡黄河特大桥，齐鲁平原一览无余',
    },
    {
      name: '徐州东站',
      carName: '徐州贾汪服务区',
      airName: '徐州高空航路点',
      coords: [117.31, 34.27],
      note: '淮海枢纽，南北风光在此交汇',
    },
    {
      name: '南京南站',
      carName: '南京八卦洲服务区',
      airName: '南京进近走廊',
      coords: [118.80, 31.97],
      note: '跨过长江！进入江南水乡与长三角腹地',
    },
  ],
  '510000-500000': [
    {
      name: '资阳北站',
      carName: '简阳服务区',
      airName: '资阳航路点',
      coords: [104.64, 30.15],
      note: '穿行川中丘陵，田园稻浪连绵',
    },
    {
      name: '内江北站',
      carName: '内江服务区',
      airName: '内江航路点',
      coords: [105.07, 29.62],
      note: '甜城内江，成渝中轴线核心节点',
    },
    {
      name: '永川东站',
      carName: '永川服务区',
      airName: '渝西进近走廊',
      coords: [105.94, 29.36],
      note: '即将穿越中梁山隧道进入山城重庆',
    },
  ],
  '330000-350000': [
    {
      name: '台州站',
      carName: '台州临海服务区',
      airName: '台州航路点',
      coords: [121.38, 28.66],
      note: '浙东南山海交错，穿行长隧道群',
    },
    {
      name: '温州南站',
      carName: '温州瑞安服务区',
      airName: '温州航路点',
      coords: [120.59, 27.97],
      note: '跨过瓯江入海口，准备进入闽东山区',
    },
    {
      name: '宁德站',
      carName: '宁德福鼎服务区',
      airName: '宁德进近走廊',
      coords: [119.55, 26.67],
      note: '三都澳海岸线尽收眼底，即将抵达福州',
    },
  ],
  '610000-540000': [
    {
      name: '兰州西站',
      carName: '兰州服务区',
      airName: '兰州高空航路点',
      coords: [103.75, 36.07],
      note: '跨过黄河谷地，进入河西与青藏过渡带',
    },
    {
      name: '西宁站',
      carName: '西宁多巴服务区',
      airName: '青海湖航路点',
      coords: [101.81, 36.62],
      note: '海拔爬升至 2,260m，开启青藏高原壮丽篇章',
    },
    {
      name: '格尔木站',
      carName: '格尔木服务区',
      airName: '昆仑山口报告点',
      coords: [94.90, 36.40],
      note: '翻越昆仑山口与可可西里边缘，圣城拉萨在望',
    },
  ],
};

function interpolateCatmullRom(points: [number, number][], samplesPerSegment = 24): [number, number][] {
  if (points.length < 2) return points;
  if (points.length === 2) {
    const out: [number, number][] = [];
    for (let i = 0; i <= samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      out.push([
        points[0][0] + (points[1][0] - points[0][0]) * t,
        points[0][1] + (points[1][1] - points[0][1]) * t,
      ]);
    }
    return out;
  }

  const out: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const lng =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const lat =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([lng, lat]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function buildFlightArc(origin: [number, number], dest: [number, number], steps = 84): [number, number][] {
  const dx = dest[0] - origin[0];
  const dy = dest[1] - origin[1];
  const dist = Math.hypot(dx, dy) || 1;
  let nx = -dy / dist;
  let ny = dx / dist;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const arcHeight = Math.min(4.8, Math.max(0.75, dist * 0.18));
  const mid: [number, number] = [
    (origin[0] + dest[0]) / 2 + nx * arcHeight,
    (origin[1] + dest[1]) / 2 + ny * arcHeight,
  ];
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    out.push([
      inv * inv * origin[0] + 2 * inv * t * mid[0] + t * t * dest[0],
      inv * inv * origin[1] + 2 * inv * t * mid[1] + t * t * dest[1],
    ]);
  }
  return out;
}

function buildGeneratedMidWaypoints(
  origin: ProvinceNode,
  dest: ProvinceNode,
  mode: TransportMode
): Array<{ name: string; shortLabel: string; coords: [number, number]; note: string }> {
  const key = `${origin.adcode}-${dest.adcode}`;
  if (CURATED_CORRIDORS[key]) {
    return CURATED_CORRIDORS[key].map((item) => {
      const label =
        mode === 'car'
          ? item.carName ?? item.name
          : mode === 'flight'
          ? item.airName ?? item.name
          : item.name;
      return {
        name: label,
        shortLabel: label.replace(/(站|服务区|导航台|走廊|报告点)/g, ''),
        coords: item.coords,
        note: item.note,
      };
    });
  }

  const dx = dest.coords[0] - origin.coords[0];
  const dy = dest.coords[1] - origin.coords[1];
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;

  const seed = ((origin.adcode % 97) + (dest.adcode % 89)) / 186;
  const bendFactor = mode === 'car' ? (seed - 0.45) * 0.13 : (seed - 0.5) * 0.07;

  const p1: [number, number] = [
    origin.coords[0] + dx * 0.34 + nx * dist * bendFactor,
    origin.coords[1] + dy * 0.34 + ny * dist * bendFactor,
  ];
  const p2: [number, number] = [
    origin.coords[0] + dx * 0.67 - nx * dist * (bendFactor * 0.75),
    origin.coords[1] + dy * 0.67 - ny * dist * (bendFactor * 0.75),
  ];

  if (mode === 'flight') {
    return [
      {
        name: `${origin.shortName}离场爬升点`,
        shortLabel: '离场爬升',
        coords: p1,
        note: '离开终端空域，稳定爬升至平流层巡航高度',
      },
      {
        name: `${dest.shortName}进近走廊点`,
        shortLabel: '进近走廊',
        coords: p2,
        note: '开始下降高度，准备对准目的地跑道',
      },
    ];
  }

  if (mode === 'car') {
    return [
      {
        name: `${origin.shortName}省际服务区`,
        shortLabel: `${origin.shortName}服务区`,
        coords: p1,
        note: '高速中段补能服务区，新能源快充桩空闲',
      },
      {
        name: `${dest.shortName}省界收费站`,
        shortLabel: `${dest.shortName}省界`,
        coords: p2,
        note: `已进入${dest.shortName}高速路网，留意前方车流变化`,
      },
    ];
  }

  return [
    {
      name: `${origin.shortName}东枢纽站`,
      shortLabel: `${origin.shortName}枢纽`,
      coords: p1,
      note: '干线高架提速区间，沿途风光掠过',
    },
    {
      name: `${dest.shortName}西门户站`,
      shortLabel: `${dest.shortName}门户`,
      coords: p2,
      note: `跨入${dest.shortName}省界，即将进入终端联络线`,
    },
  ];
}

export function computeModeMetrics(origin: ProvinceNode, dest: ProvinceNode): ModeComparisonItem[] {
  const straightKm = Math.max(85, Math.round(haversineKm(origin.coords, dest.coords)));

  const hsrDistance = Math.round(straightKm * 1.18);
  const hsrSpeed = hsrDistance > 450 ? 312 : 268;
  const hsrMinutes = Math.round((hsrDistance / hsrSpeed) * 60 + 14);

  const flightDistance = Math.round(straightKm * 1.04);
  const flightSpeed = 845;
  const flightMinutes = Math.round((flightDistance / flightSpeed) * 60 + 38);

  const carDistance = Math.round(straightKm * 1.29);
  const carSpeed = 96;
  const carMinutes = Math.round((carDistance / carSpeed) * 60 + 20);

  return [
    {
      mode: 'hsr',
      label: '高铁 · 复兴号',
      distanceKm: hsrDistance,
      durationMinutes: hsrMinutes,
      costRmb: Math.round(hsrDistance * 0.46),
      co2Kg: Math.round(hsrDistance * 0.018),
      cruiseSpeedKmh: hsrSpeed,
    },
    {
      mode: 'flight',
      label: '飞机 · 民航',
      distanceKm: flightDistance,
      durationMinutes: flightMinutes,
      costRmb: Math.round(420 + flightDistance * 0.52),
      co2Kg: Math.round(flightDistance * 0.145),
      cruiseSpeedKmh: flightSpeed,
    },
    {
      mode: 'car',
      label: '汽车 · 自驾',
      distanceKm: carDistance,
      durationMinutes: carMinutes,
      costRmb: Math.round(carDistance * 0.58),
      co2Kg: Math.round(carDistance * 0.128),
      cruiseSpeedKmh: carSpeed,
    },
  ];
}

export function buildJourneyData(
  origin: ProvinceNode,
  dest: ProvinceNode,
  mode: TransportMode
): JourneyData {
  const comparisons = computeModeMetrics(origin, dest);
  const activeMetric = comparisons.find((c) => c.mode === mode) ?? comparisons[0];

  const midWaypoints = buildGeneratedMidWaypoints(origin, dest, mode);

  const startLabel =
    mode === 'hsr'
      ? origin.stationName
      : mode === 'flight'
      ? `${origin.airportCode}机场`
      : `${origin.hubCity}高速入口`;

  const endLabel =
    mode === 'hsr'
      ? dest.stationName
      : mode === 'flight'
      ? `${dest.airportCode}机场`
      : `${dest.hubCity}高速出口`;

  const midKind: RouteWaypoint['kind'] =
    mode === 'hsr' ? 'station' : mode === 'car' ? 'service_area' : 'air_waypoint';

  const waypoints: RouteWaypoint[] = [
    {
      name: startLabel,
      shortLabel: origin.hubCity,
      coords: origin.coords,
      progress: 0,
      note: `从${origin.shortName}${startLabel}启程`,
      isStop: true,
      kind: 'origin',
    },
    ...midWaypoints.map((w, idx) => ({
      name: w.name,
      shortLabel: w.shortLabel,
      coords: w.coords,
      progress: (idx + 1) / (midWaypoints.length + 1),
      note: w.note,
      isStop: mode === 'hsr',
      kind: midKind,
    })),
    {
      name: endLabel,
      shortLabel: dest.hubCity,
      coords: dest.coords,
      progress: 1,
      note: `抵达终点 ${dest.shortName}${endLabel}`,
      isStop: true,
      kind: 'destination',
    },
  ];

  let pathCoords: [number, number][];
  if (mode === 'flight') {
    pathCoords = buildFlightArc(origin.coords, dest.coords, 84);
  } else if (mode === 'car') {
    const controlPts = waypoints.map((w, i) => {
      if (i === 0 || i === waypoints.length - 1) return w.coords;
      const jitter = (i % 2 === 0 ? 1 : -1) * 0.14;
      return [w.coords[0] + jitter, w.coords[1] - jitter * 0.7] as [number, number];
    });
    pathCoords = interpolateCatmullRom(controlPts, 24);
  } else {
    pathCoords = interpolateCatmullRom(
      waypoints.map((w) => w.coords),
      26
    );
  }

  const seedTraffic = (origin.adcode + dest.adcode) % 3;
  const carTrafficSequence: TrafficLevel[] =
    seedTraffic === 0
      ? ['smooth', 'moderate', 'smooth', 'congested', 'smooth']
      : seedTraffic === 1
      ? ['moderate', 'smooth', 'congested', 'smooth', 'moderate']
      : ['smooth', 'smooth', 'moderate', 'congested', 'smooth'];

  const segments: RouteSegment[] =
    mode === 'car'
      ? [
          {
            startProgress: 0,
            endProgress: 0.22,
            label: `${origin.hubCity}出城联络线`,
            trafficLevel: carTrafficSequence[0],
            speedLimitKmh: 100,
            weatherNote: `${origin.weather.condition}，路面${origin.weather.icon === 'rain' ? '微湿' : '干燥'}`,
          },
          {
            startProgress: 0.22,
            endProgress: 0.48,
            label: `${midWaypoints[0]?.name ?? '中段'}高速走廊`,
            trafficLevel: carTrafficSequence[1],
            speedLimitKmh: 120,
            weatherNote: '视野良好，货车右侧车道通行有序',
          },
          {
            startProgress: 0.48,
            endProgress: 0.68,
            label: '省界隧道与桥梁群路段',
            trafficLevel: carTrafficSequence[2],
            speedLimitKmh: 80,
            weatherNote:
              origin.weather.icon === 'rain' || dest.weather.icon === 'rain'
                ? '山区局地有薄雾阵雨，隧道出口注意控速'
                : '横风轻微，注意保持安全车距',
          },
          {
            startProgress: 0.68,
            endProgress: 0.86,
            label: `${midWaypoints[midWaypoints.length - 1]?.name ?? '枢纽'}互通段`,
            trafficLevel: carTrafficSequence[3],
            speedLimitKmh: 100,
            weatherNote: '汇入车流增多，快充桩空闲率 68%',
          },
          {
            startProgress: 0.86,
            endProgress: 1.01,
            label: `${dest.hubCity}进城主干道`,
            trafficLevel: carTrafficSequence[4],
            speedLimitKmh: 80,
            weatherNote: `${dest.weather.condition} · ${dest.weather.tempC}°C`,
          },
        ]
      : mode === 'hsr'
      ? [
          {
            startProgress: 0,
            endProgress: 0.25,
            label: `${origin.stationName} — ${midWaypoints[0]?.name ?? '首站'}区间`,
            trafficLevel: 'smooth',
            speedLimitKmh: activeMetric.cruiseSpeedKmh,
            weatherNote: `站区${origin.weather.condition} · 准点出站`,
          },
          {
            startProgress: 0.25,
            endProgress: 0.55,
            label: `${midWaypoints[0]?.name ?? '中段'} — ${midWaypoints[1]?.name ?? '省界站'}区间`,
            trafficLevel: 'smooth',
            speedLimitKmh: activeMetric.cruiseSpeedKmh,
            weatherNote: '接触网供电稳定，复兴号全速巡航中',
          },
          {
            startProgress: 0.55,
            endProgress: 0.82,
            label: `${midWaypoints[1]?.name ?? '省界'} — ${midWaypoints[midWaypoints.length - 1]?.name ?? '末站'}区间`,
            trafficLevel: origin.weather.windKmh > 25 ? 'moderate' : 'smooth',
            speedLimitKmh: activeMetric.cruiseSpeedKmh,
            weatherNote:
              origin.weather.windKmh > 25 ? '跨谷风速略高，系统微幅智能降速' : '信号全绿，正点运行',
          },
          {
            startProgress: 0.82,
            endProgress: 1.01,
            label: `${midWaypoints[midWaypoints.length - 1]?.name ?? '进站'} — ${dest.stationName}区间`,
            trafficLevel: 'smooth',
            speedLimitKmh: 220,
            weatherNote: `前方${dest.hubCity} ${dest.weather.condition} · ${dest.weather.tempC}°C`,
          },
        ]
      : [
          {
            startProgress: 0,
            endProgress: 0.24,
            label: `${origin.airportCode} 离场爬升走廊`,
            trafficLevel: origin.weather.visibilityKm < 10 ? 'moderate' : 'smooth',
            speedLimitKmh: 520,
            weatherNote: `跑道视程 ${origin.weather.visibilityKm} km，风速 ${origin.weather.windKmh} km/h`,
          },
          {
            startProgress: 0.24,
            endProgress: 0.76,
            label: 'FL320 高空大圆航路',
            trafficLevel: 'smooth',
            speedLimitKmh: activeMetric.cruiseSpeedKmh,
            weatherNote: '顺风助推 +28 km/h，平流层视野澄澈',
          },
          {
            startProgress: 0.76,
            endProgress: 1.01,
            label: `${dest.airportCode} 下降进近走廊`,
            trafficLevel: dest.weather.visibilityKm < 10 ? 'moderate' : 'smooth',
            speedLimitKmh: 410,
            weatherNote: `目的地地面 ${dest.weather.condition} · ${dest.weather.tempC}°C`,
          },
        ];

  const milestones: JourneyMilestone[] = waypoints.map((wp, idx) => {
    if (idx === 0) {
      return {
        progress: 0,
        tag: `始发 · ${origin.shortName}`,
        title: `从 ${wp.name} 出发`,
        detail:
          mode === 'hsr'
            ? `复兴号从${origin.stationName}平稳发车，首站前往 ${midWaypoints[0]?.name ?? dest.stationName}。`
            : mode === 'flight'
            ? `航班从${origin.airportCode}跑道腾空而起，爬升飞往 ${dest.hubCity}。`
            : `自驾驶入${origin.highwayGate}，第一程目标 ${midWaypoints[0]?.name ?? dest.hubCity}。`,
      };
    }
    if (idx === waypoints.length - 1) {
      return {
        progress: 0.96,
        tag: `终点 · ${dest.shortName}`,
        title: `即将抵达 ${wp.name}`,
        detail: dest.trivia,
      };
    }
    return {
      progress: wp.progress,
      tag: mode === 'hsr' ? `经停第 ${idx} 站` : mode === 'car' ? `途经服务区` : `航路报告点`,
      title: `经过 ${wp.name}`,
      detail: wp.note,
    };
  });

  return {
    origin,
    destination: dest,
    mode,
    distanceKm: activeMetric.distanceKm,
    totalDurationMinutes: activeMetric.durationMinutes,
    cruiseSpeedKmh: activeMetric.cruiseSpeedKmh,
    costRmb: activeMetric.costRmb,
    co2Kg: activeMetric.co2Kg,
    waypoints,
    pathCoords,
    segments,
    milestones,
    comparisons,
  };
}

export function formatDurationZh(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem} 分钟`;
  if (rem === 0) return `${h} 小时`;
  return `${h} 小时 ${rem} 分`;
}

export function getPointAtProgress(
  path: [number, number][],
  progress: number
): { coords: [number, number]; tangent: [number, number] } {
  if (path.length === 0) return { coords: [110, 23], tangent: [1, 0] };
  if (path.length === 1) return { coords: path[0], tangent: [1, 0] };
  const clamped = Math.max(0, Math.min(1, progress));
  const exactIndex = clamped * (path.length - 1);
  const i0 = Math.min(path.length - 2, Math.floor(exactIndex));
  const i1 = i0 + 1;
  const frac = exactIndex - i0;
  const lng = path[i0][0] + (path[i1][0] - path[i0][0]) * frac;
  const lat = path[i0][1] + (path[i1][1] - path[i0][1]) * frac;
  const dx = path[i1][0] - path[i0][0];
  const dy = path[i1][1] - path[i0][1];
  return {
    coords: [lng, lat],
    tangent: [dx, dy],
  };
}

export function computeLiveTelemetry(
  journey: JourneyData,
  progress: number,
  nowDate: Date = new Date()
): LiveTelemetrySnapshot {
  const p = Math.max(0, Math.min(1, progress));
  const { coords } = getPointAtProgress(journey.pathCoords, p);

  const currentSegment =
    journey.segments.find((s) => p >= s.startProgress && p <= s.endProgress) ??
    journey.segments[journey.segments.length - 1];

  // Station-by-station prev / next waypoint resolution
  let prevIdx = 0;
  for (let i = 0; i < journey.waypoints.length; i++) {
    if (p >= journey.waypoints[i].progress - 0.002) {
      prevIdx = i;
    }
  }
  const nextIdx = Math.min(journey.waypoints.length - 1, prevIdx + 1);
  const prevWaypoint = journey.waypoints[prevIdx];
  const nextWaypoint = journey.waypoints[nextIdx];

  // Check if HSR is currently decelerating into or dwelling at an intermediate station
  let isDwellingAtStop = false;
  let dwellingStopName: string | null = null;
  let stationSlowFactor = 1.0;

  if (journey.mode === 'hsr') {
    for (let i = 1; i < journey.waypoints.length - 1; i++) {
      const wp = journey.waypoints[i];
      const distToStop = Math.abs(p - wp.progress);
      if (distToStop < 0.009) {
        isDwellingAtStop = true;
        dwellingStopName = wp.name;
        stationSlowFactor = 0;
        break;
      } else if (distToStop < 0.032) {
        const factor = (distToStop - 0.009) / (0.032 - 0.009);
        stationSlowFactor = Math.min(stationSlowFactor, 0.25 + 0.75 * factor);
      }
    }
  }

  // Interpolate weather between origin and destination
  const wOrigin = journey.origin.weather;
  const wDest = journey.destination.weather;
  const activeWeather: ProvinceWeather =
    p < 0.45
      ? wOrigin
      : p > 0.65
      ? wDest
      : {
          condition:
            wOrigin.icon === 'rain' || wDest.icon === 'rain' ? '沿途阵雨转多云' : '沿途多云',
          icon: wOrigin.icon === 'rain' || wDest.icon === 'rain' ? 'rain' : 'cloud',
          tempC: Math.round(wOrigin.tempC + (wDest.tempC - wOrigin.tempC) * p),
          windKmh: Math.round(wOrigin.windKmh + (wDest.windKmh - wOrigin.windKmh) * p),
          humidity: Math.round(wOrigin.humidity + (wDest.humidity - wOrigin.humidity) * p),
          visibilityKm: Math.round(wOrigin.visibilityKm + (wDest.visibilityKm - wOrigin.visibilityKm) * p),
          summary: currentSegment.weatherNote,
        };

  let currentSpeedKmh = journey.cruiseSpeedKmh;
  let altitudeMeters = 0;
  let currentPhaseLabel = '巡航中';

  if (journey.mode === 'hsr') {
    if (isDwellingAtStop && dwellingStopName) {
      currentSpeedKmh = 0;
      currentPhaseLabel = `停靠 ${dwellingStopName}`;
    } else if (p < 0.06) {
      currentSpeedKmh = Math.round(85 + (journey.cruiseSpeedKmh - 85) * (p / 0.06));
      currentPhaseLabel = '始发出站加速';
    } else if (p > 0.93) {
      currentSpeedKmh = Math.round(65 + (journey.cruiseSpeedKmh - 65) * ((1 - p) / 0.07));
      currentPhaseLabel = `进站减速 · ${journey.destination.stationName}`;
    } else if (stationSlowFactor < 0.99) {
      currentSpeedKmh = Math.round(journey.cruiseSpeedKmh * stationSlowFactor);
      currentPhaseLabel =
        p < nextWaypoint.progress && nextWaypoint.progress - p < 0.035
          ? `减速进站 · ${nextWaypoint.name}`
          : `出站加速 · 前往 ${nextWaypoint.name}`;
    } else {
      const wave = Math.round(Math.sin(p * 18) * 6);
      currentSpeedKmh = Math.min(350, journey.cruiseSpeedKmh + wave);
      currentPhaseLabel = `前往 ${nextWaypoint.name}`;
    }
  } else if (journey.mode === 'flight') {
    if (p < 0.16) {
      const ratio = p / 0.16;
      currentSpeedKmh = Math.round(290 + (journey.cruiseSpeedKmh - 290) * ratio);
      altitudeMeters = Math.round(9800 * Math.sin((ratio * Math.PI) / 2));
      currentPhaseLabel = `离场爬升 · ${nextWaypoint.shortLabel}`;
    } else if (p > 0.82) {
      const ratio = (1 - p) / 0.18;
      currentSpeedKmh = Math.round(260 + (journey.cruiseSpeedKmh - 260) * ratio);
      altitudeMeters = Math.round(9800 * Math.sin((ratio * Math.PI) / 2));
      currentPhaseLabel = `进近降落 · ${journey.destination.airportCode}`;
    } else {
      currentSpeedKmh = journey.cruiseSpeedKmh + Math.round(Math.cos(p * 12) * 14);
      altitudeMeters = 9800 + Math.round(Math.sin(p * 10) * 120);
      currentPhaseLabel = `巡航前往 ${nextWaypoint.shortLabel}`;
    }
  } else {
    const base =
      currentSegment.trafficLevel === 'congested'
        ? 44
        : currentSegment.trafficLevel === 'moderate'
        ? 76
        : 108;
    currentSpeedKmh = Math.min(currentSegment.speedLimitKmh, base + Math.round(Math.sin(p * 25) * 6));
    currentPhaseLabel =
      currentSegment.trafficLevel === 'congested'
        ? `缓行拥堵 · 前往 ${nextWaypoint.shortLabel}`
        : currentSegment.trafficLevel === 'moderate'
        ? `车流密集 · 前往 ${nextWaypoint.shortLabel}`
        : `畅通驾驶 · 前往 ${nextWaypoint.shortLabel}`;
  }

  if (p >= 0.994) {
    currentSpeedKmh = 0;
    altitudeMeters = 0;
    currentPhaseLabel = `已抵达 ${journey.destination.hubCity}`;
  }

  const remainingKm = Math.max(0, Math.round(journey.distanceKm * (1 - p)));
  const remainingMinutes = Math.max(0, Math.round(journey.totalDurationMinutes * (1 - p)));

  const nextWaypointRemainingKm = Math.max(
    0,
    Math.round(journey.distanceKm * Math.max(0, nextWaypoint.progress - p))
  );
  const nextWaypointEtaMinutes = Math.max(
    0,
    Math.round(journey.totalDurationMinutes * Math.max(0, nextWaypoint.progress - p))
  );

  const arrivalDate = new Date(nowDate.getTime() + remainingMinutes * 60000);
  const etaClockText = `${String(arrivalDate.getHours()).padStart(2, '0')}:${String(
    arrivalDate.getMinutes()
  ).padStart(2, '0')}`;

  const nextArrivalDate = new Date(nowDate.getTime() + nextWaypointEtaMinutes * 60000);
  const nextWaypointClockText = `${String(nextArrivalDate.getHours()).padStart(2, '0')}:${String(
    nextArrivalDate.getMinutes()
  ).padStart(2, '0')}`;

  const activeAdvisories: ModeAdvisory[] = [];
  if (journey.mode === 'hsr') {
    activeAdvisories.push({
      severity: currentSegment.trafficLevel === 'moderate' ? 'caution' : 'info',
      category: 'traffic',
      title: isDwellingAtStop
        ? `正在停靠 ${dwellingStopName} · 旅客上下车`
        : `下一站 ${nextWaypoint.name} · 预计 ${nextWaypointClockText} 到达`,
      detail: `${currentSegment.label}运行平稳，距下一站还有 ${nextWaypointRemainingKm} km（约 ${formatDurationZh(nextWaypointEtaMinutes)}），终到${journey.destination.stationName}预计 ${etaClockText}。`,
    });
    activeAdvisories.push({
      severity: activeWeather.icon === 'rain' || activeWeather.icon === 'storm' ? 'caution' : 'info',
      category: 'weather',
      title: `当前区段气象：${activeWeather.condition} (${activeWeather.tempC}°C)`,
      detail: `${currentSegment.weatherNote}，车厢恒温 24°C。`,
    });
  } else if (journey.mode === 'flight') {
    activeAdvisories.push({
      severity: currentSegment.trafficLevel === 'moderate' ? 'caution' : 'info',
      category: 'traffic',
      title: `${currentPhaseLabel} · 下一节点 ${nextWaypoint.name}`,
      detail:
        altitudeMeters > 3000
          ? `当前飞行高度 ${altitudeMeters.toLocaleString()} 米，距下一航路点 ${nextWaypointRemainingKm} km，预计 ${etaClockText} 落地 ${journey.destination.airportCode}。`
          : `正在终端空域按序爬升/进近，预计 ${etaClockText} 抵达目的地跑道。`,
    });
    activeAdvisories.push({
      severity: activeWeather.windKmh > 25 ? 'caution' : 'info',
      category: 'weather',
      title: `空域与跑道能见度 ${activeWeather.visibilityKm} km`,
      detail: `高空风速 ${activeWeather.windKmh} km/h，目的地 ${journey.destination.hubCity} ${journey.destination.weather.condition} ${journey.destination.weather.tempC}°C。`,
    });
  } else {
    activeAdvisories.push({
      severity:
        currentSegment.trafficLevel === 'congested'
          ? 'alert'
          : currentSegment.trafficLevel === 'moderate'
          ? 'caution'
          : 'info',
      category: 'traffic',
      title:
        currentSegment.trafficLevel === 'congested'
          ? `前方拥堵预警：${currentSegment.label}`
          : currentSegment.trafficLevel === 'moderate'
          ? `车流密集：${currentSegment.label}`
          : `高速畅通：下一节点 ${nextWaypoint.name}`,
      detail:
        currentSegment.trafficLevel === 'congested'
          ? `当前车速降至 ${currentSpeedKmh} km/h，距 ${nextWaypoint.name} 还有 ${nextWaypointRemainingKm} km，可按 A/D 键切换左侧畅通车道。`
          : `距 ${nextWaypoint.name} 还有 ${nextWaypointRemainingKm} km（约 ${formatDurationZh(nextWaypointEtaMinutes)}），限速 ${currentSegment.speedLimitKmh} km/h。`,
    });
    activeAdvisories.push({
      severity:
        activeWeather.icon === 'rain' || activeWeather.icon === 'fog' || activeWeather.icon === 'snow'
          ? 'caution'
          : 'info',
      category: 'weather',
      title: `公路气象：${activeWeather.condition} · ${activeWeather.tempC}°C`,
      detail: `${currentSegment.weatherNote}，建议保持安全车距。`,
    });
  }

  const latestMilestone =
    [...journey.milestones].reverse().find((m) => p >= m.progress - 0.01) ?? journey.milestones[0];

  return {
    progress: p,
    currentCoords: coords,
    bearingDeg: 0,
    currentSpeedKmh,
    altitudeMeters,
    remainingMinutes,
    remainingKm,
    etaClockText,
    currentPhaseLabel,
    prevWaypoint,
    nextWaypoint,
    nextWaypointRemainingKm,
    nextWaypointEtaMinutes,
    nextWaypointClockText,
    isDwellingAtStop,
    dwellingStopName,
    currentSegment,
    activeWeather,
    activeAdvisories,
    latestMilestone,
  };
}

