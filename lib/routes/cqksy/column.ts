import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/column/:id?',
    categories: ['government'],
    example: '/cqksy/column/1846541',
    parameters: {
        id: '栏目ID，默认为 1846541（普通高考）。其他可选栏目ID: 1846644（研究生考试）, 1846542（成人高考）, 1846543（自学考试）, 1846645（教师资格考试）, 1846705（社会考试）, 1846646（学业水平合格考）, 1846647（普招专升本考试）',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.cqksy.cn/web/column/col:id.html'],
            target: '/column/:id',
        },
    ],
    name: '考试招生栏目',
    maintainers: ['cbw7172002'],
    handler: async (ctx) => {
        const { id = '1846541' } = ctx.req.param();
        const baseUrl = 'https://www.cqksy.cn';
        const columnUrl = `${baseUrl}/web/column/col${id}.html`;
    
        // 统一请求头
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Referer': 'https://www.cqksy.cn/',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        };

        // 1. 获取栏目列表页
        const response = await ofetch(columnUrl);
        const $ = load(response);

        // 栏目名称
        const columnName = $('.colName').text().trim() || '考试招生';

        // 2. 提取列表项
        const list = $('.content .content-item')
            .toArray()
            .map((item) => {
                const $item = $(item);
                const title = $item.find('p').text().trim();
                const link = $item.attr('href');
                const dateStr = $item.find('span').text().trim();

                return {
                    title,
                    link: link?.startsWith('http') ? link : `${baseUrl}${link}`,
                    pubDate: dateStr ? parseDate(dateStr) : undefined,
                };
            });

        // 3. 获取全文内容（带缓存）
        const items = await Promise.all(
            list.map((item) =>
                cache.tryGet(item.link, async () => {
                    try {
                        const detailResponse = await ofetch(item.link);
                        const $detail = load(detailResponse);

                        // 正文内容
                        const content = $detail('.ck-content').html();
                        item.description = content || '暂无正文内容';

                        // 如果列表页没有日期，从详情页提取
                        if (!item.pubDate) {
                            const timeStr = $detail('.information .time').text().replace('时间：', '').trim();
                            if (timeStr) {
                                item.pubDate = parseDate(timeStr);
                            }
                        }

                        // 提取来源作为作者
                        const source = $detail('.information .source .source-cont').text().trim();
                        if (source) {
                            item.author = source;
                        }
                    } catch {
                        // 如果详情页抓取失败，至少保留列表数据
                        item.description = '内容获取失败，请点击链接查看原文';
                    }

                    return item;
                })
            )
        );

        // 4. 返回 RSS 源
        return {
            title: `${columnName} - 重庆市教育考试院`,
            link: columnUrl,
            description: `${columnName}栏目最新信息`,
            item: items,
        };
    },
};
