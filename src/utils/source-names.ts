const SOURCE_NAMES: Record<string, string> = {
  'zuida': '最大资源', 'wujin': '无尽资源', 'tianya': '天涯资源',
  'baofeng': '暴风资源', 'jisu': '极速资源', 'baiduyun': '百度云资源',
  'ruyi': '如意资源', 'wolong': '卧龙资源', 'dytt': '电影天堂',
  'modu': '魔都资源', 'wangwang': '旺旺资源', 'hongniu': '红牛资源',
  'guangsu': '光速资源', 'jiangyu': '鲸鱼资源', 'sanliuling': '360资源',
  'haihua': '海豚资源', 'wujin2': '无尽ME', 'tianyazy': '天涯海角',
  'guangsu2': '光速HTTP', 'youku': '优酷资源', 'yilingba': '1080资源',
  'huya': '虎牙资源', 'xinlang': '新浪资源', 'ikun': 'iKun资源',
  'lezi': '乐子资源', 'xinlang2': '新浪HTTPS', 'yilingba2': '1080JSON',
  'baofeng2': '暴风APP', 'wolong2': '卧龙采集', 'lezi2': '乐子HTTP',
  'feifan': '非凡资源', 'aidan': '爱蛋资源', 'feifanapi': '非凡API',
  'feifancj': '非凡采集', 'feifancj2': '非凡采集HTTPS', 'feifan1': '非凡线路1',
  'moduzy': '魔都影视', 'leba': '乐播资源',
  'iqiyizy': '爱奇艺资源', 'ikunzy': 'iKun资源',
}

export function getSourceDisplayName(key: string): string {
  return SOURCE_NAMES[key] || key
}

export const ALL_SOURCE_KEYS = Object.keys(SOURCE_NAMES)
