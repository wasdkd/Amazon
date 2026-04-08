import pandas as pd
import re
import os
import json


def main(file2, input_file, new_data_file):
    # ==========================================
    # 1. 配置路径 (请根据实际情况修改)
    # ==========================================
    # input_file = r'D:\亚马逊市场分析_总汇\领星ABA关键词分析_飙升词\过程文件\ABA热门搜索词_最终输出结果.xlsx'
    output_html_merged = file2

    print("正在读取数据...")
    try:
        old_df = pd.read_excel(input_file)
    except Exception as e:
        print(f"读取失败: {e}")
        old_df = pd.DataFrame()

    # 如果提供了新数据文件，则读取新数据用于对比
    if new_data_file:
        print("正在读取新数据进行对比分析...")
        try:
            new_df = pd.read_excel(new_data_file)
            print(f"新数据加载完成，共 {len(new_df)} 条")
        except Exception as e:
            print(f"新数据读取失败: {e}")
            new_df = pd.DataFrame()
    else:
        new_df = pd.DataFrame()

    # 数据合并逻辑 - 只保留新数据（新增+维持）
    if not old_df.empty and not new_df.empty:
        # 获取关键词集合
        old_keywords = set(old_df['搜索词'].dropna().astype(str).tolist())
        new_keywords = set(new_df['搜索词'].dropna().astype(str).tolist())

        # 为新数据标记状态
        new_df['关键词状态'] = new_df['搜索词'].apply(
            lambda x: '新增' if x not in old_keywords else '维持'
        )

        # 只保留新数据（新增+维持），不包含跌出的旧数据
        df = new_df.copy()
        print(
            f"数据合并完成，共 {len(df)} 条（新增: {len(new_df[new_df['关键词状态'] == '新增'])}, 维持: {len(new_df[new_df['关键词状态'] == '维持'])}）")
    elif not new_df.empty:
        df = new_df.copy()
        df['关键词状态'] = '维持'
        print(f"使用新数据，共 {len(df)} 条")
    else:
        df = old_df.copy()
        df['关键词状态'] = '维持'
        print(f"使用旧数据，共 {len(df)} 条")

    df = df.fillna('')

    # ==========================================
    # 2. 数据处理逻辑
    # ==========================================
    def get_hd_image_url(url):
        if not url or str(url) == 'nan': return ""
        return re.sub(r'\._AC_.*?(\.jpg|\.png|\.jpeg)', r'\1', str(url))

    def extract_asin(url):
        try:
            if '/dp/' in str(url):
                return str(url).split('/dp/')[1].split('/')[0].split('?')[0]
            return "ASIN"
        except:
            return "ASIN"

    def parse_percent(val):
        """解析百分比字符串为浮点数"""
        try:
            if isinstance(val, (int, float)): return float(val)
            return float(str(val).replace('%', '').strip())
        except:
            return 0.0

    def parse_change_val(row):
        status = str(row['排名变化'])
        val = pd.to_numeric(row['变化名次'], errors='coerce')
        if pd.isna(val): return 0
        if status == '上升':
            return val
        elif status == '下降':
            return -val
        else:
            return 0

    df['Sort_Rank'] = pd.to_numeric(df['搜索量排名'], errors='coerce').fillna(9999999)
    df['Sort_Change'] = df.apply(parse_change_val, axis=1)

    # ==========================================
    # [新增功能] 机会分计算逻辑 (Golden/Monopoly/Shopping)
    # ==========================================
    print("正在计算机会分模型...")

    # 1. 计算 Top 3 点击总和 (垄断程度)
    df['Top3_Click_Sum'] = df.apply(lambda row:
                                    parse_percent(row.get('#1 商品点击份额', 0)) +
                                    parse_percent(row.get('#2 商品点击份额', 0)) +
                                    parse_percent(row.get('#3 商品点击份额', 0)), axis=1)

    # 2. 计算 Top 3 转化总和
    df['Top3_Conv_Sum'] = df.apply(lambda row:
                                   parse_percent(row.get('#1 商品转化份额', 0)) +
                                   parse_percent(row.get('#2 商品转化份额', 0)) +
                                   parse_percent(row.get('#3 商品转化份额', 0)), axis=1)

    # 3. 计算 供需比 (转化/点击)
    # 避免除以零
    df['Conv_Click_Ratio'] = df.apply(lambda row:
                                      row['Top3_Conv_Sum'] / row['Top3_Click_Sum'] if row['Top3_Click_Sum'] > 0 else 0,
                                      axis=1)

    # 4. 定义标签判定逻辑
    def get_opportunity_label(row):
        rank_change = row.get('排名变化', '')
        # 如果有 'Sort_Change' 且 > 0 也可以作为上升依据
        change_val = row.get('Sort_Change', 0)

        is_rising = (rank_change == '上升') or (change_val > 0)
        click_sum = row['Top3_Click_Sum']
        ratio = row['Conv_Click_Ratio']

        # ⭐ 黄金词：排名上升 + 垄断低(<40%) + 转化好(Ratio > 0.8)
        if is_rising and click_sum < 40 and ratio > 0.8:
            return '黄金词'

        # 💀 垄断词：Top3点击 > 60%
        if click_sum > 60:
            return '垄断词'

        # 📉 逛街词：点击尚可(例如>10%) 但 Ratio < 0.3
        if click_sum > 10 and ratio < 0.3:
            return '逛街词'

        return '普通'

    df['机会类型'] = df.apply(get_opportunity_label, axis=1)

    # ==========================================
    # 2.1 对比分析逻辑
    # ==========================================
    comparison_data = {}

    if not old_df.empty and not new_df.empty:
        # 执行对比分析
        old_keywords = set(old_df['搜索词'].dropna().astype(str).tolist())
        new_keywords = set(new_df['搜索词'].dropna().astype(str).tolist())

        # 计算新增和跌出的关键词
        added_keywords = new_keywords - old_keywords
        dropped_keywords = old_keywords - new_keywords

        # 品类对比
        old_categories = old_df.groupby('品类')['搜索词'].count().to_dict()
        new_categories = new_df.groupby('品类')['搜索词'].count().to_dict()

        # 计算品类变化
        all_categories = set(old_categories.keys()) | set(new_categories.keys())
        category_changes = {}
        for cat in all_categories:
            old_count = old_categories.get(cat, 0)
            new_count = new_categories.get(cat, 0)
            category_changes[cat] = {
                'old_count': old_count,
                'new_count': new_count,
                'change': new_count - old_count
            }

        # 按变化量排序（正数在前，负数在后）
        sorted_categories = sorted(category_changes.items(), key=lambda x: x[1]['change'], reverse=True)

        # 收集对比数据
        comparison_data = {
            'old_total': len(old_keywords),
            'new_total': len(new_keywords),
            'added_count': len(added_keywords),
            'dropped_count': len(dropped_keywords),
            'added_keywords_list': list(added_keywords)[:50],  # 只取前50个
            'dropped_keywords_list': list(dropped_keywords)[:50],  # 只取前50个
            'category_comparison': {
                'old': old_categories,
                'new': new_categories,
                'changes': category_changes,
                'sorted_categories': sorted_categories
            }
        }

        print(f"对比分析完成 - 新增: {len(added_keywords)}, 跌出: {len(dropped_keywords)}")
    else:
        # 单份数据，添加默认状态
        df['关键词状态'] = '维持'
        df['排名变化数值'] = df.apply(parse_change_val, axis=1)

    # ==========================================
    # 3. HTML 格式化
    # ==========================================
    def format_keyword_col(row):
        kw = row['搜索词']
        rank = row['搜索量排名']
        change_val = row['变化名次']
        link = f"https://www.amazon.com/s?k={kw}"
        status = row.get('关键词状态', '维持')  # 获取关键词状态

        try:
            r_num = int(rank)
            if r_num <= 1000:
                rank_cls = "rk-10"
            elif r_num <= 5000:
                rank_cls = "rk-50"
            elif r_num <= 10000:
                rank_cls = "rk-100"
            elif r_num <= 50000:
                rank_cls = "rk-500"
            elif r_num <= 100000:
                rank_cls = "rk-1000"
            else:
                rank_cls = "rk-norm"
        except:
            rank_cls = "rk-norm"

        rank_html = f'<span class="rk-tag {rank_cls}">排名:{rank}</span>'

        # 添加状态标识
        if status == '新增':
            status_badge = '<span class="status-badge new">新增</span>'
        else:
            status_badge = ''  # 维持状态不显示标记

        try:
            change_num = int(change_val) if change_val else 0
        except:
            change_num = 0

        if status == '新增':
            # 新增关键词特殊样式
            style = "color:#52c41a; background:#f6ffed; border:1px solid #d9f7be; font-weight:600;"
            icon = "▲"
        else:
            row_status = str(row['排名变化'])
            if row_status == '上升':
                if change_num >= 100:
                    style = "color:#237804; background:#f6ffed; border:1px solid #95de64; font-weight:700;"
                elif change_num >= 50:
                    style = "color:#389e0d; background:#f6ffed; border:1px solid #b7eb8f; font-weight:600;"
                else:
                    style = "color:#52c41a; background:#f6ffed; border:1px solid #d9f7be; font-weight:500;"
                icon = "▲"
            elif row_status == '下降':
                if change_num >= 100:
                    style = "color:#a8071a; background:#fff1f0; border:1px solid #ff7875; font-weight:700;"
                elif change_num >= 50:
                    style = "color:#cf1322; background:#fff1f0; border:1px solid #ffa39e; font-weight:600;"
                else:
                    style = "color:#f5222d; background:#fff1f0; border:1px solid #ffccc7; font-weight:500;"
                icon = "▼"
            else:
                style = "color:#8c8c8c; background:#fafafa; border:1px solid #f0f0f0; font-weight:500;"
                icon = "-"

        arrow_html = f'<span style="{style} font-size:11px; padding:2px 6px; border-radius:3px;">{icon} {change_val}</span>'

        return (
            f'<div class="kw-box">'
            f'  <a href="{link}" target="_blank" class="kw-link">{kw}</a>'
            f'  <div class="kw-meta">{status_badge}{rank_html} {arrow_html}</div>'
            f'  <div class="kw-date">{row["开始日期"]}~{row["结束日期"]}</div>'
            f'</div>'
        )

    def format_product_col(row, idx):
        prefix = f"#{idx} 商品"
        url = row.get(prefix, '')
        raw_img = row.get(f"{prefix}主图", '') or row.get(f"{prefix}主图 (新)", '')
        hd_img = get_hd_image_url(raw_img)
        title = str(row.get(f"{prefix}标题", ''))
        title_short = (title[:50] + '...') if len(title) > 50 else title
        click = row.get(f"{prefix}点击份额", 0)
        conv = row.get(f"{prefix}转化份额", 0)
        asin = extract_asin(url)

        if not url or str(url).lower() == 'nan':
            return "<span style='color:#eee;'>-</span>"

        img_html = f'<div class="p-img"><img src="{hd_img}" loading="lazy" data-hd="{hd_img}"></div>' if hd_img else ''

        return (
            f'<div class="p-card">'
            f'  <a href="{url}" target="_blank">{img_html}</a>'
            f'  <div class="p-info">'
            f'      <a href="{url}" target="_blank" class="p-title" title="{title}">{title_short}</a>'
            f'      <div class="p-asin">ASIN: {asin}</div>'
            f'      <div class="p-metrics">'
            f'          <span class="metric-item click">🖱️ 点击 <strong>{click}%</strong></span>'
            f'          <span class="metric-item conv">🎯 转化 <strong>{conv}%</strong></span>'
            f'      </div>'
            f'  </div>'
            f'</div>'
        )

    # ==========================================
    # 4. 构建输出 DataFrame
    # ==========================================
    display_df = pd.DataFrame()
    display_df['Sort_Rank_Hidden'] = df['Sort_Rank']
    display_df['Sort_Change_Hidden'] = df['Sort_Change']

    # 辅助函数：格式化机会类型列
    def format_opp_col(val):
        if val == '黄金词':
            return '<span class="opp-tag golden">⭐ 黄金词</span>'
        elif val == '垄断词':
            return '<span class="opp-tag monopoly">💀 垄断词</span>'
        elif val == '逛街词':
            return '<span class="opp-tag shopping">📉 逛街词</span>'
        else:
            return '<span style="color:#ccc">-</span>'

    display_df['关键词信息'] = df.apply(format_keyword_col, axis=1)
    display_df['机会类型'] = df['机会类型'].apply(format_opp_col)

    # 调整顺序：把 '机会类型' 插入到 '关键词信息' 后面
    cols = list(display_df.columns)
    attr_cols = ['品类', '风格', '面料', '版型', '设计元素', '颜色', '季节', '人群', '场景']

    # 确保所有属性列都在 df 中存在，否则填充为 '-'
    for col in attr_cols:
        if col in df.columns:
            display_df[col] = df[col].apply(lambda x: str(x).strip() if str(x).strip() else '-')
        else:
            display_df[col] = '-'

    # 添加商品列
    display_df['Top 1'] = df.apply(lambda row: format_product_col(row, 1), axis=1)
    display_df['Top 2'] = df.apply(lambda row: format_product_col(row, 2), axis=1)
    display_df['Top 3'] = df.apply(lambda row: format_product_col(row, 3), axis=1)

    # 最终列顺序
    final_cols = ['Sort_Rank_Hidden', 'Sort_Change_Hidden', '关键词信息', '机会类型'] + attr_cols + ['Top 1', 'Top 2', 'Top 3']

    # 检查是否有缺失的列并补充
    missing_cols = set(final_cols) - set(display_df.columns)
    if missing_cols:
        for col in missing_cols:
            display_df[col] = '-'  # 填充缺失列为 '-'

    # 重新排列列顺序
    display_df = display_df[final_cols]

    # 构建前端 DataTables 数据 (仅表头+空 tbody，由前端按需渲染，可显著降低初始 DOM 体量)
    final_cols = ['Sort_Rank_Hidden', 'Sort_Change_Hidden', '关键词信息', '机会类型'] + attr_cols + ['Top 1', 'Top 2', 'Top 3']
    # 生成行数据（HTML 字符串作为单元格内容）
    dt_rows = []
    for i in range(len(display_df)):
        row_vals = [str(display_df[col].iloc[i]) for col in final_cols]
        dt_rows.append(row_vals)
    table_header_html = "<thead><tr>" + "".join([f"<th>{c}</th>" for c in final_cols]) + "</tr></thead><tbody></tbody>"
    table_html = f'<table id="reportTable" class="display" style="width:100%">{table_header_html}</table>'

    # ==========================================
    # ==========================================
    # ==========================================
    # 6. JS 逻辑 (终极修复版：强制解码 + 智能关联筛选)
    # ==========================================
    js_script = f"""
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
        <script>
            $(document).ready(function() {
                var tableApi;
                var allRawData = [];
                var activeFilters = {};
                var baseColumnOptions = {};
                var dtRows = JSON.parse(document.getElementById('dt-data').textContent || '[]');

                // 1. 强力文本提取函数 (核心修复)
                // 无论是否有 HTML 标签，都通过 DOM 解析来还原特殊字符 (如 &amp; -> &)
                function stripHtml(html) {
                    if (html === null || html === undefined) return "-";
                    var str = String(html);
                    if (!str || str === 'nan') return "-";

                    // 创建临时元素解析 HTML 实体
                    var div = document.createElement("div");
                    div.innerHTML = str;
                    var text = div.textContent || div.innerText || "";
                    return text.trim() || "-";
                }

                // 2. 表头预处理
                var $thead = $('#reportTable thead');
                var $tr = $thead.find('tr').first().clone();
                $tr.addClass('filter-row');
                $tr.find('th').html('');
                $thead.append($tr);

                // 3. 自定义筛选逻辑
                $.fn.dataTable.ext.search.push(
                    function(settings, searchData, index, rowData, counter) {
                        // A. 范围筛选
                        var minRank = parseInt( $('#rank-min').val(), 10 );
                        var maxRank = parseInt( $('#rank-max').val(), 10 );
                        var minChange = parseInt( $('#change-min').val(), 10 );
                        var maxChange = parseInt( $('#change-max').val(), 10 );

                        var rank = parseFloat( rowData[0] ) || 0;
                        var change = parseFloat( rowData[1] ) || 0;

                        var rankOk = (isNaN(minRank) && isNaN(maxRank)) || (isNaN(minRank) && rank <= maxRank) || (minRank <= rank && isNaN(maxRank)) || (minRank <= rank && rank <= maxRank);
                        var changeOk = (isNaN(minChange) && isNaN(maxChange)) || (isNaN(minChange) && change <= maxChange) || (minChange <= change && isNaN(maxChange)) || (minChange <= change && change <= maxChange);

                        if (!rankOk || !changeOk) return false;

                        // B. 下拉多选 (核心)
                        for (var colIdx in activeFilters) {
                            var selectedSet = activeFilters[colIdx];
                            // 如果有选中的项，且不是全选
                            if (selectedSet && selectedSet.size > 0 && !selectedSet.has('ALL')) {
                                // 获取当前行该列的原始数据 (Raw HTML)
                                var cellHtml = rowData[colIdx];
                                // 必须用完全相同的 stripHtml 逻辑处理，确保 &amp; 和 & 一致
                                var cellText = stripHtml(cellHtml);

                                if (!selectedSet.has(cellText)) return false;
                            }
                        }
                        return true;
                    }
                );

                // 4. 初始化 DataTable
                var table = $('#reportTable').DataTable({
                    dom: '<"dataTables_scroll"t><"hidden-ctrls"ip>',
                    orderCellsTop: true,
                    scrollY: '55vh',
                    scrollX: true,
                    scrollCollapse: true,
                    paging: true,
                    pageLength: 50,
                    processing: true,
                    deferRender: true,
                    data: dtRows,
                    autoWidth: false,
                    lengthMenu: [[50, 100, -1], [50, 100, "全部"]],
                    columnDefs: [
                        { targets: [0, 1], visible: false },
                        { targets: [2], width: "220px", className: "kw-col", orderable: false },
                        { targets: [3,4,5,6,7,8,9,10,11,12], width: "70px", className: "dt-center attr-col", orderable: false },
                        { targets: [13,14,15], width: "280px", className: "dt-center product-col", orderable: false }
                    ],
                    initComplete: function() {
                        tableApi = this.api();
                        window.myTable = tableApi;

                        // 直接基于 JSON 构建 allRawData，避免解析 DOM
                        for (var i=0; i<dtRows.length; i++) {
                            var row = dtRows[i];
                            var clean = [];
                            for (var j=0; j<16; j++) {
                                clean.push(stripHtml(row[j]));
                            }
                            allRawData.push(clean);
                        }

                        // 调试输出：查看解析到了多少个不一样的品类
                        var categories = new Set();
                        allRawData.forEach(r => categories.add(r[4])); // 4是品类列
                        console.log("解析到的品类数量:", categories.size, categories);

                        $('.app-footer').empty().append($('.dataTables_info')).append($('.dataTables_paginate'));
                        $('.hidden-ctrls').remove();

                        initCustomFilters();
                        adjustHeight();
                    }
                });

                // 5. 初始化筛选 UI
                function initCustomFilters() {
                    $('.dataTables_scrollHead thead tr.filter-row th').each(function(i) {
                        var colIdx = i + 2; // 可视列 0,1,2 -> 真实列 2,3,4
                        // 3=机会, 4=品类 ... 12=场景
                        if (colIdx >= 3 && colIdx <= 12) {
                            createDropdown(colIdx, $(this));
                        }
                    });
                    recalcOptionsAndCounts();
                }

                function createDropdown(colIdx, $th) {
                    var $btn = $('<div class="multi-select-btn" data-col="'+colIdx+'">全部</div>').appendTo($th);
                    var $dropdown = $('<div class="multi-select-dropdown" id="dd-'+colIdx+'" style="display:none;"></div>').appendTo('body');
                    var $list = $('<div class="ms-list"></div>').appendTo($dropdown);

                    // 全选项
                    $list.append(
                        '<div class="ms-item all-option">' +
                        '<input type="checkbox" value="ALL" checked><span>(全选)</span>' +
                        '</div><div class="ms-divider"></div>'
                    );

                    // 收集选项
                    var uniqueValues = new Set();
                    allRawData.forEach(function(row) {
                        uniqueValues.add(row[colIdx]);
                    });
                    baseColumnOptions[colIdx] = Array.from(uniqueValues).sort();

                    // 渲染选项
                    baseColumnOptions[colIdx].forEach(function(val) {
                        // 处理双引号，防止 HTML 属性截断
                        var safeVal = val.replace(/"/g, '&quot;');
                        $list.append(
                            '<div class="ms-item option-item" data-val="'+safeVal+'">' +
                            '<input type="checkbox" value="'+safeVal+'"> ' +
                            '<span>'+val+'</span> ' +
                            '<span class="ms-count"></span>' +
                            '</div>'
                        );
                    });

                    // 打开事件
                    $btn.on('click', function(e) {
                        e.stopPropagation();
                        $('.multi-select-dropdown').not($dropdown).hide();
                        var offset = $(this).offset();
                        // 防止超出右边界
                        var leftPos = offset.left;
                        if(leftPos + 200 > $(window).width()) leftPos = $(window).width() - 210;

                        $dropdown.css({ top: offset.top + $(this).outerHeight() + 2, left: leftPos }).show();
                    });
                    $dropdown.on('click', function(e){ e.stopPropagation(); });

                    // 选项点击逻辑
                    $list.on('click', '.ms-item', function(e) {
                        // 防止点击 label/input 触发两次
                        if (e.target.tagName === 'INPUT') e.stopPropagation();

                        var $chk = $(this).find('input');
                        var val = $chk.val();

                        // 如果点击的是 div 行，手动切换 checkbox
                        if (e.target.tagName !== 'INPUT') {
                             $chk.prop('checked', !$chk.prop('checked'));
                        }
                        var isChecked = $chk.prop('checked');

                        if (val === 'ALL') {
                            // 点击全选
                            if (isChecked) {
                                $list.find('.option-item input').prop('checked', false);
                                delete activeFilters[colIdx];
                            } else {
                                // 不允许取消全选来清空，取消全选等于没有操作，保持全选状态
                                 $chk.prop('checked', true);
                            }
                        } else {
                            // 点击普通项
                            var anyChecked = $list.find('.option-item input:checked').length > 0;
                            $list.find('.all-option input').prop('checked', !anyChecked);

                            if (!activeFilters[colIdx]) activeFilters[colIdx] = new Set();
                            if (isChecked) activeFilters[colIdx].add(val);
                            else activeFilters[colIdx].delete(val);

                            if (activeFilters[colIdx].size === 0) delete activeFilters[colIdx];
                        }

                        tableApi.draw();
                        recalcOptionsAndCounts();
                        updateButtonText(colIdx);
                    });
                }

                function updateButtonText(colIdx) {
                    var $btn = $('.multi-select-btn[data-col="'+colIdx+'"]');
                    var set = activeFilters[colIdx];
                    if (!set || set.size === 0) {
                        $btn.text('全部').removeClass('has-filter');
                    } else {
                        $btn.text('已选(' + set.size + ')').addClass('has-filter');
                    }
                }

                // 6. 计数与显隐逻辑 (关联筛选核心)
                function recalcOptionsAndCounts() {
                    for (var targetCol = 3; targetCol <= 12; targetCol++) {
                        if (!baseColumnOptions[targetCol]) continue;

                        // 获取"上下文" (除了自己之外的其他列筛选)
                        var contextFilters = {};
                        for (var fCol in activeFilters) {
                            if (parseInt(fCol) !== targetCol) contextFilters[fCol] = activeFilters[fCol];
                        }

                        // 统计
                        var counts = {};
                        baseColumnOptions[targetCol].forEach(v => counts[v] = 0);

                        var minRank = parseInt($('#rank-min').val(),10), maxRank = parseInt($('#rank-max').val(),10);
                        var minChange = parseInt($('#change-min').val(),10), maxChange = parseInt($('#change-max').val(),10);

                        for (var i = 0; i < allRawData.length; i++) {
                            var row = allRawData[i];

                            // 1. 范围筛选检查
                            var rRank = parseFloat(row[0])||0, rChange = parseFloat(row[1])||0;
                            var rankOk = (isNaN(minRank) && isNaN(maxRank)) || (isNaN(minRank) && rRank <= maxRank) || (minRank <= rRank && isNaN(maxRank)) || (minRank <= rRank && rRank <= maxRank);
                            var changeOk = (isNaN(minChange) && isNaN(maxChange)) || (isNaN(minChange) && rChange <= maxChange) || (minChange <= rChange && isNaN(maxChange)) || (minChange <= rChange && rChange <= maxChange);
                            if (!rankOk || !changeOk) continue;

                            // 2. 上下文筛选检查
                            var matchContext = true;
                            for (var fCol in contextFilters) {
                                if (!contextFilters[fCol].has(row[fCol])) { matchContext = false; break; }
                            }

                            if (matchContext) {
                                var val = row[targetCol];
                                if (counts.hasOwnProperty(val)) counts[val]++;
                            }
                        }

                        // 更新 DOM
                        var $dropdown = $('#dd-' + targetCol);
                        var currentSelected = activeFilters[targetCol] || new Set();
                        var isAll = (currentSelected.size === 0);

                        // 同步全选按钮状态
                        $dropdown.find('.all-option input').prop('checked', isAll);

                        $dropdown.find('.option-item').each(function() {
                            var $item = $(this);
                            var val = $item.data('val');
                            var count = counts[val] || 0;
                            var isChecked = currentSelected.has(val);

                            // 同步checkbox状态 (修复截图里已选1但全选框也勾着的bug)
                            $item.find('input').prop('checked', isChecked);
                            $item.find('.ms-count').text('(' + count + ')');

                            // 显示规则：有数据 OR 已被选中
                            if (count > 0 || isChecked) {
                                $item.show();
                                $item.removeClass('zero-count');
                                if (count === 0) $item.addClass('zero-count');
                            } else {
                                $item.hide();
                            }
                        });
                    }
                }

                // 事件绑定
                $('#rank-min, #rank-max, #change-min, #change-max').on('keyup change', function() {
                    tableApi.draw(); recalcOptionsAndCounts();
                });
                $('#inp-search').on('keyup', function() { tableApi.search(this.value).draw(); });
                $('#sel-len').on('change', function() { tableApi.page.len(this.value).draw(); });
                $('#sel-sort').on('change', function() {
                    var v = this.value;
                    if(v==='rank_asc') tableApi.order([0,'asc']).draw();
                    if(v==='change_desc') tableApi.order([1,'desc']).draw();
                });

                $('#btn-reset').click(function() {
                    $('input.range-input').val('');
                    $('#inp-search').val('');
                    $('select').val($('select option:first').val());
                    activeFilters = {};
                    $('.multi-select-btn').text('全部').removeClass('has-filter');
                    tableApi.search('').columns().search('').order([0, 'asc']).draw();
                    recalcOptionsAndCounts();
                });

                function adjustHeight() {
                    var bodyH = $(window).height() - $('.app-header').outerHeight() - $('.app-footer').outerHeight() - $('.dataTables_scrollHead').outerHeight() - 10;
                    if (bodyH < 200) bodyH = 200;
                    $('.dataTables_scrollBody').css({'height': bodyH, 'max-height': bodyH});
                    if(tableApi) tableApi.columns.adjust();
                }
                $(window).on('resize', function() { setTimeout(adjustHeight, 100); });
                $(document).on('click', function() { $('.multi-select-dropdown').hide(); });

                var $p = $('#preview-overlay'), $img = $p.find('img');
                $(document).on('mouseenter', 'img[data-hd]', function(e) {
                    $img.attr('src', $(this).data('hd')); $p.show(); moveP(e);
                }).on('mousemove', moveP).on('mouseleave', 'img[data-hd]', function() { $p.hide(); });
                function moveP(e) {
                    var x=e.clientX+15, y=e.clientY+15;
                    if(x+550 > $(window).width()) x = e.clientX - 550;
                    if(y+550 > $(window).height()) y = $(window).height() - 550;
                    $p.css({left:x, top:y});
                }

                // 机会洞察矩阵图片放大效果 - 与TOP 10模块保持一致
                $(document).on('mouseenter', '.matrix-item .item-img-container img', function(e) {
                    $(this).closest('.item-img-container').css('z-index', '9999');
                    $(this).css({
                        'transform': 'scale(3.5)',
                        'box-shadow': '0 5px 15px rgba(0,0,0,0.3)',
                        'position': 'absolute',
                        'top': '0',
                        'left': '0',
                        'min-width': '100%',
                        'min-height': '100%',
                        'object-fit': 'contain',
                        'text-decoration': 'none !important'
                    });
                }).on('mouseleave', '.matrix-item .item-img-container img', function() {
                    $(this).closest('.item-img-container').css('z-index', '1');
                    $(this).css({
                        'transform': 'scale(1)',
                        'box-shadow': 'none',
                        'position': 'static',
                        'top': 'auto',
                        'left': 'auto',
                        'min-width': 'auto',
                        'min-height': 'auto',
                        'object-fit': 'contain',
                        'text-decoration': 'none !important'
                    });
                });

                $('.toggle-comparison-btn').click(function() {
                    $('.comparison-panel').slideToggle();
                    var t = $(this).find('span').text();
                    $(this).find('span').text(t === '▶' ? '▼' : '▶');
                });
            });
        </script>
        <style>
            .multi-select-dropdown { width: 220px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 12px; }
            .ms-list { max-height: 400px; overflow-y: auto; }
            .ms-item.zero-count { color: #ccc; }
            .ms-item.zero-count span { text-decoration: line-through; }
            .ms-item.all-option { position: sticky; top: 0; background: #fff; z-index: 10; border-bottom: 2px solid #f0f0f0; }
            .filter-row th { overflow: visible !important; }
        </style>
        """

    # 7. 生成单文件整合报表 (终极修复版：修复空行/分页/交互)
    # ==========================================

    print("正在构建整合报表数据...")

    # ---------------------------------------------------------
    # [Part A] 深度分析数据准备
    # ---------------------------------------------------------
    analysis_df = df.copy()
    analysis_df['搜索量排名'] = pd.to_numeric(analysis_df['搜索量排名'], errors='coerce')
    analysis_df['Sort_Change'] = pd.to_numeric(analysis_df['Sort_Change'], errors='coerce').fillna(0)
    analysis_df['变化名次'] = pd.to_numeric(analysis_df['变化名次'], errors='coerce').fillna(0)
    analysis_df['品类'] = analysis_df['品类'].fillna('未分类').replace(['-', '', 'nan', 'NaN'], '未分类')

    categories = sorted([x for x in analysis_df['品类'].unique() if x])
    analysis_attrs = ['风格', '面料', '版型', '设计元素', '颜色', '季节', '人群', '场景']

    # 全局统计
    total_kws = len(analysis_df)
    total_rise = len(analysis_df[analysis_df['排名变化'] == '上升'])
    total_cats = len(categories)
    try:
        avg_rank = int(analysis_df['搜索量排名'].mean())
    except:
        avg_rank = 0

    # 寻找默认品类
    default_cat_idx = 0
    max_count = -1
    for idx, cat in enumerate(categories):
        if cat == '未分类' and len(categories) > 1: continue
        count = len(analysis_df[analysis_df['品类'] == cat])
        if count > max_count:
            max_count = count
            default_cat_idx = idx

    # 辅助函数：生成分析列表
    def make_top10_html(sub_df):
        if sub_df.empty: return '<div style="padding:20px;text-align:center;color:#999;">暂无数据</div>'
        df_left = sub_df.iloc[:5]
        df_right = sub_df.iloc[5:]

        def render_col(items_df, start_rank):
            col_html = []
            for i, (index, row) in enumerate(items_df.iterrows()):
                rank_idx = start_rank + i
                kw = row['搜索词']
                rank_val = row['搜索量排名']
                change_val = row['变化名次']
                change_dir = row['排名变化']

                try:
                    rank_disp = f"{int(rank_val):,}"
                except:
                    rank_disp = "-"
                try:
                    chg_num = int(change_val)
                    if change_dir == '上升':
                        chg_disp = f'<span class="rise-val">▲{chg_num:,}</span>'
                    elif change_dir == '下降':
                        chg_disp = f'<span class="fall-val">▼{chg_num:,}</span>'
                    else:
                        chg_disp = '-'
                except:
                    chg_disp = '-'

                tags = []
                for attr in ['风格', '颜色', '材质', '场景']:
                    val = str(row.get(attr, '')).strip()
                    if val and val not in ['-', 'nan', '']: tags.append(f'<span class="tag">{val}</span>')
                tags_html = "".join(tags[:3])

                imgs_html = ""
                for p_idx in [1, 2, 3]:
                    col_name = f'#{p_idx} 商品主图'
                    img_url = str(row.get(col_name, ''))
                    if img_url and img_url != 'nan':
                        hd_url = get_hd_image_url(img_url)
                        imgs_html += f'<div class="p-img-box"><img src="{hd_url}"><div class="p-rank">{p_idx}</div></div>'
                if not imgs_html: imgs_html = '<div style="font-size:10px;color:#ccc;">无图</div>'

                item = f"""
                <div class="top-item" data-rank="{rank_idx}">
                    <div class="rank-badge">{rank_idx}</div>
                    <div class="item-content">
                        <div class="item-header"><a href="https://www.amazon.com/s?k={kw}" target="_blank" class="item-kw" title="{kw}">{kw}</a></div>
                        <div class="metrics-row"><div class="metric">排名: <span>{rank_disp}</span></div><div class="metric">变化: {chg_disp}</div></div>
                        <div class="item-tags">{tags_html}</div>
                        <div class="prod-imgs">{imgs_html}</div>
                    </div>
                </div>"""
                col_html.append(item)
            return "".join(col_html)

        return f'<div class="top-list-grid"><div class="top-list-col">{render_col(df_left, 1)}</div><div class="top-list-col">{render_col(df_right, 6)}</div></div>'

    # 构建分析页面 HTML 内容
    cat_html_list = []
    options_list = []

    for idx, cat in enumerate(categories):
        safe_cat_val = f"cat_{idx}"
        is_selected = "selected" if idx == default_cat_idx else ""
        options_list.append(f'<option value="{safe_cat_val}" {is_selected}>{cat}</option>')

        cat_df = analysis_df[analysis_df['品类'] == cat]
        cat_count = len(cat_df)

        soaring_df = cat_df.sort_values(by='Sort_Change', ascending=False).head(10)
        ranking_df = cat_df.sort_values(by='搜索量排名', ascending=True).head(10)

        # === [新增] 生成机会洞察矩阵 HTML ===
        def make_matrix_list(items_df):
            if items_df.empty: return '<div style="font-size:12px;color:#ccc;text-align:center;padding:10px;">无数据</div>'
            html_parts = []
            # 取前10个，一行显示2个
            for _, row in items_df.head(10).iterrows():
                kw = row['搜索词']
                rank = row['搜索量排名']
                change_val = row['变化名次']
                change_dir = row['排名变化']

                # 获取Top3点击和转化总和
                top3_click_sum = row.get('Top3_Click_Sum', 0)
                top3_conv_sum = row.get('Top3_Conv_Sum', 0)

                # 供需比
                ratio = row.get('Conv_Click_Ratio', 0)

                rank_disp = f"R:{int(rank)}" if pd.notnull(rank) else "-"

                # 处理变化值显示
                try:
                    chg_num = int(change_val)
                    if change_dir == '上升':
                        chg_disp = f'<span class="rise-val">▲{chg_num:,}</span>'
                    elif change_dir == '下降':
                        chg_disp = f'<span class="fall-val">▼{chg_num:,}</span>'
                    else:
                        chg_disp = '-'
                except:
                    chg_disp = '-'

                # 获取第一商品的图片
                img_url = str(row.get('#1 商品主图', ''))
                img_tag = f'<img src="{get_hd_image_url(img_url)}" loading="lazy" data-hd="{get_hd_image_url(img_url)}">' if img_url and img_url != 'nan' else '<div style="width:60px;height:60px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;color:#999;">无图</div>'

                html_parts.append(f"""
                        <a href="https://www.amazon.com/s?k={kw}" target="_blank" class="matrix-item">
                            <div class="item-img-container">{img_tag}</div>
                            <div class="m-content">
                                <div class="m-kw" title="{kw}">{kw}</div>
                                <div class="m-metrics">
                                    <div class="m-rank">排名: <strong>{rank_disp}</strong></div>
                                    <div class="m-change">变化: {chg_disp}</div>
                                </div>
                                <div class="m-stats">
                                    <div class="m-click">🖱️ 点击: <strong>{top3_click_sum:.1f}%</strong></div>
                                    <div class="m-conv">🎯 转化: <strong>{top3_conv_sum:.1f}%</strong></div>
                                    <div class="m-ratio">🔄 供需比: <strong>{ratio:.2f}</strong></div>
                                </div>
                            </div>
                        </a>""")
            return f'<div class="matrix-list">{"".join(html_parts)}</div>'

        # 筛选三类词 (按排名排序，越靠前越好)
        golden_df = cat_df[cat_df['机会类型'] == '黄金词'].sort_values('搜索量排名')
        monopoly_df = cat_df[cat_df['机会类型'] == '垄断词'].sort_values('搜索量排名')
        shopping_df = cat_df[cat_df['机会类型'] == '逛街词'].sort_values('搜索量排名')

        opp_matrix_html = f"""
                <div class="section-title"><span>🔍 机会洞察矩阵</span></div>
                <div class="matrix-container">
                    <div class="matrix-card">
                        <div class="matrix-header golden" title="黄金词定义：排名上升 + 垄断低(点击率&lt;40%) + 转化好(供需比 &gt; 0.8)">
                            <span>⭐ 黄金词 (潜力)</span>
                            <span style="font-weight:normal;font-size:12px;background:#fff;padding:1px 6px;border-radius:10px;">{len(golden_df)}</span>
                        </div>
                        <div class="matrix-body">{make_matrix_list(golden_df)}</div>
                    </div>
                    <div class="matrix-card">
                        <div class="matrix-header monopoly" title="垄断词定义：Top3点击率总和 &gt; 60%">
                            <span>💀 垄断词 (避坑)</span>
                            <span style="font-weight:normal;font-size:12px;background:#fff;padding:1px 6px;border-radius:10px;">{len(monopoly_df)}</span>
                        </div>
                        <div class="matrix-body">{make_matrix_list(monopoly_df)}</div>
                    </div>
                    <div class="matrix-card">
                        <div class="matrix-header shopping" title="逛街词定义：点击尚可(点击率&gt;10%) 但 供需比 &lt; 0.3">
                            <span>📉 逛街词 (低效)</span>
                            <span style="font-weight:normal;font-size:12px;background:#fff;padding:1px 6px;border-radius:10px;">{len(shopping_df)}</span>
                        </div>
                        <div class="matrix-body">{make_matrix_list(shopping_df)}</div>
                    </div>
                </div>
                """

        top_soar_html = make_top10_html(soaring_df)
        top_rank_html = make_top10_html(ranking_df)

        attrs_cards_html = []
        for attr in analysis_attrs:
            if attr not in cat_df.columns: continue
            valid_vals = cat_df[attr].replace(['-', '', 'nan', 'NaN'], None).dropna()
            if valid_vals.empty: continue

            val_counts = valid_vals.value_counts().head(5)
            sub_groups_html = []
            for val_name, count in val_counts.items():
                percent = (count / len(cat_df)) * 100
                sub_kws_df = cat_df[cat_df[attr] == val_name].sort_values(by='搜索量排名', ascending=True).head(6)

                mini_list_html = []
                for _, k_row in sub_kws_df.iterrows():
                    k_kw = k_row['搜索词']
                    k_rank = k_row['搜索量排名']
                    k_chg = k_row['变化名次']
                    k_img = str(k_row.get('#1 商品主图', ''))
                    img_tag = f'<img src="{get_hd_image_url(k_img)}">' if k_img and k_img != 'nan' else ''
                    try:
                        chg_n = int(k_chg)
                        if k_row['排名变化'] == '上升':
                            chg_span = f'<span style="color:#52c41a">▲{chg_n:,}</span>'
                        elif k_row['排名变化'] == '下降':
                            chg_span = f'<span style="color:#f5222d">▼{chg_n:,}</span>'
                        else:
                            chg_span = '-'
                    except:
                        chg_span = '-'

                    mini_list_html.append(f"""
                    <div class="mini-kw-item"><div class="mini-img">{img_tag}</div><div class="mini-info">
                            <a href="https://www.amazon.com/s?k={k_kw}" target="_blank" class="mini-link" title="{k_kw}">{k_kw}</a>
                            <div class="mini-meta"><span>R:<b>{int(k_rank) if pd.notnull(k_rank) else '-'}</b></span>{chg_span}</div>
                    </div></div>""")

                sub_groups_html.append(f"""
                <div class="sub-attr-group"><div class="sub-attr-title"><span class="sub-attr-name">{val_name}</span><span style="color:#999;font-weight:normal;font-size:12px;">占比 {int(percent)}% ({count}个)</span></div>
                    <div class="bar-bg"><div class="bar-fg" style="width: {percent}%;"></div></div>
                    <div class="mini-kw-list">{"".join(mini_list_html)}</div>
                </div>""")
            attrs_cards_html.append(
                f'<div class="attr-card"><div class="attr-header">{attr}分布 <small style="font-weight:normal;color:#999;margin-left:5px;">(Top 5)</small></div><div class="attr-body">{"".join(sub_groups_html)}</div></div>')

        def check_all_empty(row):
            for att in analysis_attrs:
                val = str(row.get(att, ''))
                if val and val not in ['-', 'nan', 'NaN', '']: return False
            return True

        empty_attr_df = cat_df[cat_df.apply(check_all_empty, axis=1)]
        empty_card_html = ""
        if not empty_attr_df.empty:
            empty_list_html = make_top10_html(empty_attr_df.sort_values(by='搜索量排名', ascending=True).head(10))
            empty_card_html = f"""
            <div class="list-card" style="margin-top:20px; border-color:#d9d9d9;">
                <div class="card-header gray"><span>🌑 未标注/纯净属性关键词 Top 10</span><small style="font-weight:normal;">(共 {len(empty_attr_df)} 个)</small></div>
                {empty_list_html}
            </div>"""

        attrs_content = "".join(
            attrs_cards_html) if attrs_cards_html else '<div style="padding:20px; text-align:center; color:#999;">该品类暂无详细属性数据</div>'
        try:
            min_rank_val = int(cat_df['搜索量排名'].min())
        except:
            min_rank_val = '-'
        rise_count_val = len(cat_df[cat_df['排名变化'] == '上升'])

        conv_col = '#1 商品转化份额'
        has_conv = 0
        if conv_col in cat_df.columns:
            try:
                has_conv = len(cat_df[cat_df[conv_col].astype(str).str.rstrip('%').replace('', '0').astype(float) > 0])
            except:
                pass

        display_style = "block" if idx == default_cat_idx else "none"
        active_class = "active" if idx == default_cat_idx else ""

        section_html = f"""
        <div class="cat-section {active_class}" data-cat="{safe_cat_val}" style="display:{display_style};">
            <div class="summary-grid">
                <div class="stat-card"><div class="stat-val">{cat_count}</div><div class="stat-label">关键词总数</div></div>
                <div class="stat-card"><div class="stat-val">{min_rank_val}</div><div class="stat-label">最高排名</div></div>
                <div class="stat-card"><div class="stat-val" style="color:#52c41a">+{rise_count_val}</div><div class="stat-label">上升期词数</div></div>
                <div class="stat-card"><div class="stat-val" style="color:#722ed1">{has_conv}</div><div class="stat-label">有转化关键词数</div></div>
            </div>
            {opp_matrix_html}
            <div class="top-lists-container">
                <div class="list-card"><div class="card-header red"><span>🚀 飙升最快 TOP 10</span></div>{top_soar_html}</div>
                <div class="list-card"><div class="card-header blue"><span>👑 排名最高 TOP 10</span></div>{top_rank_html}</div>
            </div>
            <div class="section-title"><span>🔍 维度属性深度透视</span><span class="section-note">仅展示有标记的数据</span></div>
            <div class="attrs-grid">{attrs_content}</div>
            {empty_card_html}
        </div>"""
        cat_html_list.append(section_html)

    # ---------------------------------------------------------
    # [Part B] 最终整合 HTML 构建
    # ---------------------------------------------------------
    merged_css = f"""
    <style>
        :root {{
            --bg-body: #ffffff;
            --bg-header: #ffffff;
            --bg-th: #f8f9fa;
            --border-color: #eff2f5;
            --text-main: #2c3e50;
            --text-sub: #95a5a6;
            --primary: #3498db;
            --report-bg: #f0f2f5;
        }}

        .status-badge {{
            display: inline-block;
            width: 40px;
            height: 18px;
            border-radius: 3px;
            text-align: center;
            line-height: 18px;
            font-size: 11px;
            margin-right: 4px;
            vertical-align: middle;
        }}
        .status-badge.new {{
            background: #fff1f0;
            border: 1px solid #ffa39e;
            color: #f5222d;
        }}

        * {{ box-sizing: border-box; }}

        html, body {{ margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }}
        body.view-mode-table {{ height: 100vh; overflow: hidden; background: var(--bg-body); }}
        body.view-mode-analysis {{ height: auto; overflow: auto; background-color: var(--report-bg); }}
        .hidden-view {{ display: none !important; }}

        /* ============ 【核心修复】DataTables 空行与分页修复 ============ */
        /* 1. 隐藏 ScrollBody 中的头部副本，高度压为0 */
        .dataTables_scrollBody thead {{
            visibility: collapse !important;
            height: 0px !important;
            line-height: 0px !important;
        }}
        .dataTables_scrollBody thead th {{
            height: 0px !important;
            padding-top: 0px !important;
            padding-bottom: 0px !important;
            border-top: none !important;
            border-bottom: none !important;
            margin: 0px !important;
            line-height: 0px !important;
            font-size: 0px !important;
            overflow: hidden !important;
        }}

        /* 2. 重置 Footer 布局，强制对齐 */
        .app-footer {{
            flex: 0 0 40px;
            width: 100%;
            display: flex;
            justify-content: space-between; /* 左右分布 */
            align-items: center;
            padding: 0 20px;
            border-top: 1px solid var(--border-color);
            font-size: 12px;
            color: #666;
            background: #fff;
            z-index: 10;
            overflow: hidden; /* 防止分页溢出 */
        }}

        /* 3. 强制清除 DataTables 分页的默认浮动 */
        .dataTables_wrapper .dataTables_info,
        .dataTables_wrapper .dataTables_paginate {{
            float: none !important;
            text-align: left !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex;
            align-items: center;
        }}
        .dataTables_paginate {{ justify-content: flex-end; }}

        /* ============ 【分页按钮修复】增加按钮间距 ============ */
        .dataTables_paginate .paginate_button {{
            padding: 4px 8px !important;
            margin: 0 4px !important;  /* 增加按钮之间的间距 */
            font-size: 12px !important;
            border-radius: 4px !important;
            border: 1px solid #d9d9d9 !important;
            background: #fff !important;
            color: #333 !important;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 32px;  /* 设置最小宽度 */
            text-align: center;
            line-height: 1.4;
        }}

        .dataTables_paginate .paginate_button:hover {{
            background: #f5f5f5 !important;
            border-color: #999 !important;
        }}

        .dataTables_paginate .paginate_button.current {{
            background: #1890ff !important;
            color: #fff !important;
            border-color: #1890ff !important;
            font-weight: bold;
        }}

        .dataTables_paginate .paginate_button.disabled {{
            color: #ccc !important;
            cursor: not-allowed;
            opacity: 0.6;
        }}
        /* ========================================================== */

        /* 表格页基础样式 */
        .app-wrapper {{ display: flex; flex-direction: column; height: 100%; width: 100%; }}
        .app-header {{
            flex: 0 0 45px; display: flex; justify-content: space-between; align-items: center;
            padding: 0 15px; border-bottom: 1px solid var(--border-color); background: var(--bg-header);
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); z-index: 10;
        }}
        .brand {{ font-size: 18px; font-weight: 800; color: #2c3e50; white-space: nowrap; margin-right: 15px; display:flex; align-items:center; gap:10px; }}

        .btn-switch-view {{
            background: #e6f7ff; color: #1890ff; border: 1px solid #1890ff;
            padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;
            text-decoration: none; display: flex; align-items: center; gap: 5px; transition: all 0.2s;
        }}
        .btn-switch-view:hover {{ background: #1890ff; color: #fff; }}
        .btn-switch-view.back {{ background: #fff1f0; color: #f5222d; border-color: #f5222d; }}
        .btn-switch-view.back:hover {{ background: #f5222d; color: #fff; }}

        .tools {{ display: flex; gap: 8px; align-items: center; }}
        .filter-group {{ display: flex; align-items: center; gap: 4px; background: #f8f9fa; padding: 1px 6px; border-radius: 4px; border: 1px solid #eee; }}
        .filter-label {{ font-size: 11px; font-weight: 600; color: #666; margin-right: 2px; }}
        .range-input {{ width: 80px; text-align: center; height: 26px; border: 1px solid #e2e6ea; border-radius: 4px; outline: none; }}
        .btn-reset {{ height: 26px; padding: 0 10px; border: 1px solid #ffdce0; background: #fff0f1; color: #e74c3c; border-radius: 4px; cursor: pointer; font-weight: 600; }}
        .table-container {{ flex: 1; position: relative; overflow: hidden; padding: 0 10px; }}
        .dataTables_wrapper {{ height: 100%; display: flex; flex-direction: column; width: 100%; }}
        .dataTables_scroll {{ flex: 1; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }}
        .dataTables_scrollHead {{ flex: 0 0 auto; background: var(--bg-th); z-index: 5; }}
        .dataTables_scrollBody {{ flex: 1 1 auto; border-bottom: 1px solid var(--border-color); }}

        table.dataTable {{ border-collapse: collapse !important; }}
        table.dataTable thead th {{ background: #d0fcd5; font-size: 16px; padding: 4px !important; height: 35px; white-space: nowrap; text-align: center; }}
        .filter-row th {{ background: #e4ffff !important; padding: 2px !important; height: 10px !important; }}
        /* 单元格方框线：保留原布局，仅增强边框显示 */
        table.dataTable thead th, table.dataTable tbody td {{ border: 1px solid #e6e6e6 !important; }}
        table.dataTable tbody td {{ padding: 2px !important; text-align: center; vertical-align: middle; font-size: 13px; }}

        /* 关键词链接颜色恢复 */
        .kw-link {{ display: block; font-size: 17px; font-weight: 600; color: #202124; text-decoration: none; margin-bottom: 2px; transition: color 0.2s; }}
        .kw-link:hover {{ color: var(--primary) !important; text-decoration: underline; }}

        .kw-meta {{ gap: 4px; align-items: center; font-size: 11px; }}
        .kw-date {{ font-size: 11px; color: #c39; margin-top: 2px; }}
        .rk-tag {{ padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 11px; }}
        .rk-10 {{ color: #d48806; background: #fffbe6; border: 1px solid #ffe58f; }} .rk-50 {{ color: #d46b08; background: #fff7e6; border: 1px solid #ffd591; }} .rk-100 {{ color: #cf1322; background: #fff1f0; border: 1px solid #ffccc7; }} .rk-500 {{ color: #531dab; background: #f9f0ff; border: 1px solid #d3adf7; }} .rk-1000 {{ color: #096dd9; background: #e6f7ff; border: 1px solid #91d5ff; }} .rk-norm {{ color: #8c8c8c; background: #fafafa; border: 1px solid #e8e8e8; }}

        .p-card {{ display: flex; gap: 6px; width: 100%; padding: 2px; max-width: 300px; margin: 0 auto; }}
        .p-img {{ width: 80px; height: 90px; border: 1px solid #eee; border-radius: 3px; padding: 1px; flex-shrink: 0; background: #fff; }}
        .p-img img {{ width: 100%; height: 100%; object-fit: contain; }}
        .p-info {{ flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px; text-align: left; }}
        .p-title {{ font-size: 13px; color: #333; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-height: 1.3; font-weight: 500; text-decoration:none; white-space: normal; }}
        .p-asin {{ font-size: 11px; color: #91F; }}
        .p-metrics {{ font-size: 11px; }}
        .metric-item.click {{ color: #1890ff; background: #e6f7ff; padding: 1px 3px; border-radius: 2px; }}
        .metric-item.conv {{ color: #52c41a; background: #f6ffed; padding: 1px 3px; border-radius: 2px; }}

        .multi-select-btn {{ width: 100%; height: 20px; background: #fafafa; border: 1px solid #eee; border-radius: 3px; font-size: 11px; color: #555; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 0 2px; }}
        .multi-select-btn.has-filter {{ background: #e6f7ff; border-color: #1890ff; color: #096dd9; font-weight: bold; }}
        .multi-select-dropdown {{ display: none; position: absolute; z-index: 99999; background: #fff; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 160px; text-align: left; display: flex; flex-direction: column; }}
        .ms-list {{ max-height: 250px; overflow-y: auto; padding: 4px 0; }}
        .ms-item {{ display: flex; align-items: center; padding: 3px 6px; cursor: pointer; font-size: 11px; color: #333; }}
        .ms-item:hover {{ background: #f5f5f5; }}
        .ms-item[style*="opacity"] {{ cursor: not-allowed; }}
        .ms-divider {{ height: 1px; background: #eee; margin: 3px 0; }}

        /* ============ 分析页样式 ============ */
        #view-analysis-container {{ width: 96%; max-width: 1920px; margin: 0 auto; padding: 20px 0 60px 0; }}

        .report-header {{ position: sticky; top: 0; z-index: 1000; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); padding: 15px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }}
        .report-title h1 {{ margin: 0; font-size: 22px; color: #1a1a1a; display: flex; align-items: center; gap: 10px; }}
        .category-select {{ padding: 8px 12px; font-size: 15px; border: 2px solid #1890ff; border-radius: 6px; min-width: 300px; cursor: pointer; font-weight: bold; color: #1890ff; background: #fff; }}

        .summary-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }}
        .stat-card {{ background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); text-align: center; border-top: 4px solid transparent; }}
        .stat-card:nth-child(1) {{ border-color: #1890ff; }} .stat-card:nth-child(2) {{ border-color: #faad14; }}
        .stat-card:nth-child(3) {{ border-color: #52c41a; }} .stat-card:nth-child(4) {{ border-color: #722ed1; }}
        .stat-val {{ font-size: 24px; font-weight: 800; color: #333; }} .stat-label {{ font-size: 12px; color: #888; font-weight: 600; margin-top: 2px; }}

        .cat-section {{ display: none; animation: fadeIn 0.3s; padding-bottom: 20px; }}
        .cat-section.active {{ display: block; }}
        @keyframes fadeIn {{ from {{ opacity:0; transform: translateY(10px); }} to {{ opacity:1; transform: translateY(0); }} }}

        /* 分析页图片放大特效 */
        .item-img, .p-img-box, .mini-img {{ position: relative; z-index: 1; overflow: visible !important; cursor: zoom-in; }}
        .item-img img, .p-img-box img, .mini-img img {{ transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s; border-radius: 4px; background: #fff; }}
        .item-img:hover, .p-img-box:hover, .mini-img:hover {{ z-index: 9999; }}
        .item-img:hover img, .p-img-box:hover img, .mini-img:hover img {{ transform: scale(3.5); box-shadow: 0 5px 15px rgba(0,0,0,0.3); position: absolute; top: 0; left: 0; min-width: 100%; min-height: 100%; object-fit: contain; }}

        /* 机会洞察矩阵图片放大特效（独立处理） */
        .item-img-container {{ position: relative; z-index: 1; overflow: visible !important; cursor: zoom-in; }}
        .item-img-container img {{ transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s; border-radius: 4px; background: #fff; }}
        .item-img-container.matrix-zoom:hover {{ z-index: 9999; }}
        .item-img-container.matrix-zoom:hover img {{ transform: scale(3.5); box-shadow: 0 5px 15px rgba(0,0,0,0.3); position: absolute; top: 0; left: 0; min-width: 100%; min-height: 100%; object-fit: contain; }}

        /* 分析页列表 */
        .top-lists-container {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }}
        .list-card {{ background: #fff; border-radius: 8px; border: 1px solid #e8e8e8; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }}
        .card-header {{ padding: 10px 20px; background: #fafafa; border-bottom: 1px solid #eee; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: space-between; border-radius: 8px 8px 0 0; }}
        .card-header.red {{ color: #cf1322; border-left: 5px solid #cf1322; }} .card-header.blue {{ color: #096dd9; border-left: 5px solid #096dd9; }} .card-header.gray {{ color: #595959; border-left: 5px solid #595959; }}

        .top-list-grid {{ display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #f0f0f0; }}
        .top-list-col {{ display: flex; flex-direction: column; }} .top-list-col:first-child {{ border-right: 1px solid #f0f0f0; }}
        .top-item {{ display: flex; align-items: start; padding: 10px; border-bottom: 1px solid #f5f5f5; gap: 10px; height: 100%; box-sizing: border-box; }}
        .top-item:hover {{ background: #fdfdfd; }}
        .rank-badge {{ width: 20px; height: 20px; background: #eee; color: #666; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; flex-shrink: 0; margin-top: 2px; }}
        .top-item[data-rank="1"] .rank-badge {{ background: #ffec3d; color: #d46b08; }} .top-item[data-rank="2"] .rank-badge {{ background: #d3adf7; color: #531dab; }} .top-item[data-rank="3"] .rank-badge {{ background: #ffccc7; color: #a8071a; }}

        .item-content {{ flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }}
        .item-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 5px; }}
        .item-kw {{ font-size: 15px; font-weight: 700; color: #222; text-decoration: none; line-height: 1.3; word-break: break-word; }} .item-kw:hover {{ color: #1890ff; text-decoration: underline; }}
        .item-tags {{ display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }}
        .tag {{ padding: 0px 4px; border-radius: 2px; font-size: 10px; background: #f7f7f7; color: #888; border: 1px solid #eee; white-space: nowrap; }}
        .metrics-row {{ display: flex; gap: 10px; font-size: 14px; color: #666; margin-bottom: 6px; background: #fafafa; padding: 2px 6px; border-radius: 3px; }}
        .rise-val {{ color: #52c41a; font-weight:bold; }} .fall-val {{ color: #f5222d; font-weight:bold; }}
        .prod-imgs {{ display: flex; gap: 5px; }}
        .p-img-box {{ width: 45px; height: 55px; border: 1px solid #eee; border-radius: 3px; padding: 1px; background: #fff; }} .p-img-box img {{ width: 100%; height: 100%; object-fit: contain; }}
        .p-rank {{ position: absolute; top: -4px; left: -4px; width: 14px; height: 14px; background: rgba(0,0,0,0.6); color: #fff; font-size: 8px; border-radius: 50%; text-align: center; line-height: 14px; z-index: 2; }}

        /* 分析页维度卡片 */
        .section-title {{ margin: 25px 0 15px; font-size: 16px; border-left: 5px solid #722ed1; padding-left: 10px; color: #333; font-weight: bold; background: #fff; padding: 8px 15px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }}
        .attrs-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }}
        .attr-card {{ background: #fff; border-radius: 8px; border: 1px solid #e8e8e8; overflow: visible; display: flex; flex-direction: column; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }}
        .attr-header {{ padding: 8px 15px; background: #fcfcfc; border-bottom: 1px solid #eee; font-weight: bold; color: #333; font-size: 14px; border-left: 3px solid #1890ff; border-radius: 8px 8px 0 0; }}
        .sub-attr-group {{ margin-bottom: 20px; }} .sub-attr-group:last-child {{ margin-bottom: 0; }}
        .sub-attr-title {{ display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #333; margin-bottom: 6px; align-items: center; }}
        .sub-attr-name {{ color: #1890ff; background: #e6f7ff; padding: 2px 8px; border-radius: 3px; }}
        .bar-bg {{ width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }}
        .bar-fg {{ height: 100%; background: #69c0ff; border-radius: 3px; }}

        .mini-kw-list {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
        .mini-kw-item {{ display: flex; gap: 8px; align-items: center; background: #fafafa; padding: 6px; border-radius: 4px; border: 1px solid #f0f0f0; min-width: 0; }}
        .mini-img {{ width: 32px; height: 38px; flex-shrink: 0; border: 1px solid #eee; background: #fff; }} .mini-img img {{ width: 100%; height: 100%; object-fit: contain; }}
        .mini-info {{ flex: 1; min-width: 0; overflow: hidden; }}
        .mini-link {{ display: block; font-size: 14px; color: #333; text-decoration: none; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }} .mini-link:hover {{ color: #1890ff; text-decoration: underline; }}
        .mini-meta {{ font-size: 10px; color: #888; display: flex; gap: 8px; margin-top: 1px; }} .mini-meta span b {{ color: #333; }}

        #preview-overlay {{ position: fixed; display: none; z-index: 99999; background: #fff; border: 1px solid #ddd; padding: 5px; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 450px; height: 550px; pointer-events: none; }}
        #preview-overlay img {{ width: 100%; height: 100%; object-fit: contain; }}

        /* 对比分析面板样式 */
        .comparison-panel {{
            background: #fff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border-left: 4px solid #1890ff;
        }}
        .comparison-title {{
            font-size: 16px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 8px;
        }}
        .comparison-stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }}
        .comparison-stat {{
            background: #fafafa;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
        }}
        .comparison-value {{
            font-size: 20px;
            font-weight: bold;
            margin: 5px 0;
        }}
        .comparison-label {{
            font-size: 15px;
            color: #888;
        }}
        .comparison-added {{ color: #52c41a; }}
        .comparison-dropped {{ color: #f5222d; }}

        /* 折叠面板样式 */
        .toggle-comparison-btn {{
            background: #e6f7ff;
            color: #1890ff;
            border: 1px solid #1890ff;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            margin-bottom: 10px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }}
        .toggle-comparison-btn:hover {{
            background: #1890ff;
            color: #fff;
        }}

        /* 图表容器样式 */
        .chart-container {{
            height: 500px;
            margin-top: 20px;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 10px;
            background: #fafafa;
        }}
        /* ============ [新增] 机会词标签样式 ============ */
        .opp-tag {{
            padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;
            display: inline-block; margin-right: 5px;
        }}
        .opp-tag.golden {{ background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }}
        .opp-tag.monopoly {{ background: #f5f5f5; color: #595959; border: 1px solid #d9d9d9; }}
        .opp-tag.shopping {{ background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }}

        /* ============ [新增] 分析页-机会洞察矩阵样式 ============ */
        .matrix-container {{
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;
        }}
        .matrix-card {{
            background: #fff; border-radius: 8px; border: 1px solid #eee;
            box-shadow: 0 2px 6px rgba(0,0,0,0.02); overflow: hidden;
            text-decoration: none !important;
        }}
        .matrix-header {{
            padding: 10px 15px; font-weight: 700; font-size: 14px;
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #f0f0f0;
            text-decoration: none !important;
        }}
        .matrix-header a, .matrix-header span {{
            text-decoration: none !important;
        }}
        .matrix-header.golden {{ background: #fffbe6; color: #d46b08; border-top: 3px solid #faad14; text-decoration: none !important; }}
        .matrix-header.monopoly {{ background: #fafafa; color: #595959; border-top: 3px solid #595959; text-decoration: none !important; }}
        .matrix-header.shopping {{ background: #e6f7ff; color: #096dd9; border-top: 3px solid #1890ff; text-decoration: none !important; }}

        .matrix-body {{ padding: 10px; }}
        .matrix-list {{
            display: grid;
            grid-template-columns: repeat(2, 1fr); /* 一行显示2个 */
            gap: 8px;
        }}
        /* 如果屏幕够宽，让大容器内的关键词一行显示更多，这里用flex布局模拟一行6个可能太挤，建议自适应 */
        .matrix-item {{
            background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 4px;
            padding: 8px; display: flex; flex-direction: row; gap: 8px;
            transition: all 0.2s;
            min-height: 80px;
            text-decoration: none !important;
        }}
        .matrix-item:hover {{ border-color: #d9d9d9; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-decoration: none !important; }}
        .item-img-container {{ width: 60px; height: 60px; flex-shrink: 0; }}
        .item-img-container img {{ width: 100%; height: 100%; object-fit: contain; }}
        .m-content {{ flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }}
        .m-kw {{ font-size: 12px; font-weight: 600; color: #333; text-decoration: none !important; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 4px; }}
        .m-kw:hover {{ color: #1890ff; text-decoration: none !important; }}
        .m-metrics {{ display: flex; gap: 10px; font-size: 11px; color: #666; margin-bottom: 4px; }}
        .m-rank, .m-change {{ background: #fafafa; padding: 1px 4px; border-radius: 2px; text-decoration: none !important; }}
        .m-stats {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; text-decoration: none !important; }}
        .m-click, .m-conv, .m-ratio {{ background: #f8f9fa; padding: 2px 4px; border-radius: 2px; text-decoration: none !important; }}
        .m-tag {{ font-size: 9px; padding: 1px 3px; border-radius: 2px; background: #eee; color: #666; text-decoration: none !important; }}
    </style>
    """

    # 合并 HTML 结构
    # 在分析页部分添加对比分析面板
    comparison_panel_html = ""
    if comparison_data:  # 如果有对比数据
        # 构建图表数据 - 按变化量降序排列（正数在前，负数在后）
        sorted_categories = comparison_data['category_comparison']['sorted_categories']
        cats = [item[0] for item in sorted_categories]  # 按变化量降序排列的品类
        old_counts = [comparison_data['category_comparison']['old'].get(cat, 0) for cat in cats]
        new_counts = [comparison_data['category_comparison']['new'].get(cat, 0) for cat in cats]
        changes = [comparison_data['category_comparison']['changes'][cat]['change'] for cat in cats]

        chart_data = {
            'labels': cats,
            'old_counts': old_counts,
            'new_counts': new_counts,
            'changes': changes
        }
        # 计算新数据中的机会词分布 - 修复：使用正确的DataFrame
        count_golden = len(df[df['机会类型'] == '黄金词']) if '机会类型' in df.columns else 0
        count_monopoly = len(df[df['机会类型'] == '垄断词']) if '机会类型' in df.columns else 0
        count_shopping = len(df[df['机会类型'] == '逛街词']) if '机会类型' in df.columns else 0
        # 整体分析数据
        overall_stats = f"""
            <div class="comparison-panel">
                <div class="comparison-title">📊 整体对比分析</div>
                <div class="comparison-stats">
                    <div class="comparison-stat">
                        <div class="comparison-label">关键词总数</div>
                        <div class="comparison-value">{comparison_data['old_total']} → {comparison_data['new_total']}</div>
                        <div class="comparison-value" style="font-size: 14px; color: #1890ff;">
                            {'📈 +' + str(comparison_data['new_total'] - comparison_data['old_total']) if comparison_data['new_total'] > comparison_data['old_total'] else '📉 ' + str(comparison_data['new_total'] - comparison_data['old_total'])}
                        </div>
                    </div>
                    <div class="comparison-stat">
                        <div class="comparison-label">新增关键词</div>
                        <div class="comparison-value comparison-added">{comparison_data['added_count']}</div>
                    </div>
                    <div class="comparison-stat">
                        <div class="comparison-label">跌出关键词</div>
                        <div class="comparison-value comparison-dropped">{comparison_data['dropped_count']}</div>
                    </div>
                     <!-- 新增机会统计 -->
                    <div class="comparison-stat" style="background:#fffbe6; border:1px solid #ffe58f;">
                        <div class="comparison-label" style="color:#d46b08">⭐ 黄金词</div>
                        <div class="comparison-value" style="color:#d46b08">{count_golden}</div>
                    </div>
                    <div class="comparison-stat" style="background:#f5f5f5; border:1px solid #d9d9d9;">
                        <div class="comparison-label" style="color:#595959">💀 垄断词</div>
                        <div class="comparison-value" style="color:#595959">{count_monopoly}</div>
                    </div>
                    <div class="comparison-stat" style="background:#e6f7ff; border:1px solid #91d5ff;">
                        <div class="comparison-label" style="color:#096dd9">📉 逛街词</div>
                        <div class="comparison-value" style="color:#096dd9">{count_shopping}</div>
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    <div style="font-weight: bold; margin-bottom: 10px; color: #333;">📈 品类变化分析</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            """

        # 品类对比
        all_categories = set(comparison_data['category_comparison']['old'].keys()) | set(
            comparison_data['category_comparison']['new'].keys())
        for cat in sorted(all_categories):
            old_count = comparison_data['category_comparison']['old'].get(cat, 0)
            new_count = comparison_data['category_comparison']['new'].get(cat, 0)
            diff = new_count - old_count

            if diff > 0:
                color = "#52c41a"
                icon = "📈"
            elif diff < 0:
                color = "#f5222d"
                icon = "📉"
            else:
                color = "#8c8c8c"
                icon = "➡️"

            overall_stats += f"""
                    <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; border-left: 3px solid {color}; min-width: 120px;">
                        <div style="font-size: 14px; color: #666;">{cat}</div>
                        <div style="font-size: 14px; font-weight: bold;">{old_count} → {new_count}</div>
                        <div style="font-size: 12px; color: {color};">{icon} {diff:+d}</div>
                    </div>
                """

        overall_stats += "</div></div>"

        # 品类变化图表
        overall_stats += f"""
        <div style="margin-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #333;">📊 品类变化可视化图表 (按变化量排序)</div>
            <div class="chart-container">
                <canvas id="categoryChart"></canvas>
            </div>
        </div>
        """

        overall_stats += "</div>"
        comparison_panel_html = overall_stats

    # 修改分析页HTML结构，插入对比面板
    final_html_structure = f"""<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>关键词趋势综合分析报表</title>
            <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
            {merged_css}
        </head>
        <body class="view-mode-table">

            <!-- ================= 视图 A: 表格 ================= -->
            <div id="view-table" class="app-wrapper">
                <header class="app-header">
                    <div class="brand">🔥 亚马逊飙升词</div>
                    <div class="tools">
                        <button class="btn-switch-view" onclick="switchView('analysis')">
                            <span>📊</span> 切换至深度分析报告
                        </button>
                        <div style="width:1px; height:20px; background:#eee; margin:0 10px;"></div>

                        <div class="filter-group">
                            <span class="filter-label">排名:</span>
                            <input type="number" id="rank-min" class="range-input" placeholder="Min">
                            <span class="range-sep">-</span>
                            <input type="number" id="rank-max" class="range-input" placeholder="Max">
                        </div>
                        <div class="filter-group">
                            <span class="filter-label">变化:</span>
                            <input type="number" id="change-min" class="range-input" placeholder="Min">
                            <span class="range-sep">-</span>
                            <input type="number" id="change-max" class="range-input" placeholder="Max">
                        </div>
                        <button id="btn-reset" class="btn-reset">重置</button>
                        <select id="sel-sort">
                            <option value="rank_asc">按排名 (Top)</option>
                            <option value="change_desc">按飙升 (Max)</option>
                        </select>
                        <select id="sel-len">
                            <option value="50">50条</option>
                            <option value="100">100条</option>
                            <option value="-1">全部</option>
                        </select>
                        <input type="text" id="inp-search" placeholder="全局搜索..." style="width: 150px;">
                    </div>
                </header>
                <div class="table-container">
                    {table_html}
                </div>
                <footer class="app-footer"></footer>
            </div>

            <!-- ================= 视图 B: 深度分析 ================= -->
            <div id="view-analysis" class="hidden-view">
                <div class="report-header">
                    <div class="report-title">
                        <button class="btn-switch-view back" onclick="switchView('table')" style="margin-right:15px;">
                            ⬅ 返回数据表格
                        </button>
                        <h1>📊 ABA 关键词深度分析报告</small></h1>
                    </div>
                    <div>
                        <select id="categorySelect" class="category-select" onchange="showCategory(this.value)">
                            {"".join(options_list)}
                        </select>
                    </div>
                </div>

                <div id="view-analysis-container">
                    {f'<button class="toggle-comparison-btn"><span>▶</span> 查看整体对比分析</button>' if comparison_data else ''}
                    {comparison_panel_html if comparison_data else ''}

                    <!-- 默认空状态(实际隐藏，因有默认品类) -->
                    <div class="empty-state" style="display:none;">
                        <h2>全类目数据概览</h2>
                        <p>总关键词: <strong>{total_kws}</strong> | 涉及品类: <strong>{total_cats}</strong> | 飙升词: <strong>{total_rise}</strong></p>
                    </div>
                    <div id="categories-container">
                        {"".join(cat_html_list)}
                    </div>
                </div>
            </div>

            <div id="preview-overlay"><img src=""></div>

            <script id="dt-data" type="application/json">{json.dumps(dt_rows, ensure_ascii=False)}</script>
            {js_script}
            <script>
                // === 视图切换逻辑 ===
                function switchView(mode) {{
                    if(mode === 'analysis') {{
                        document.getElementById('view-table').classList.add('hidden-view');
                        document.getElementById('view-analysis').classList.remove('hidden-view');
                        document.body.classList.remove('view-mode-table');
                        document.body.classList.add('view-mode-analysis');
                        window.scrollTo(0,0);
                    }} else {{
                        document.getElementById('view-analysis').classList.add('hidden-view');
                        document.getElementById('view-table').classList.remove('hidden-view');
                        document.body.classList.remove('view-mode-analysis');
                        document.body.classList.add('view-mode-table');

                        // 关键修正：切换回来时强制重算列宽
                        if(window.myTable) {{
                            setTimeout(function() {{
                                window.myTable.columns.adjust();
                            }}, 50);
                        }}
                    }}
                }}

                // === 分析页品类切换逻辑 ===
                function showCategory(catName) {{
                    var sections = document.querySelectorAll('.cat-section');
                    sections.forEach(function(sec) {{
                        sec.style.display = 'none';
                        sec.classList.remove('active');
                    }});
                    var target = document.querySelector('.cat-section[data-cat="'+catName+'"]');
                    if (target) {{
                        target.style.display = 'block';
                        setTimeout(function(){{ target.classList.add('active'); }}, 10);
                        if(window.scrollY > 100) window.scrollTo({{top: 0, behavior: 'smooth'}});
                    }}
                }}

                // 初始化品类变化图表 - 添加数值显示
                {f'''
                // 注册datalabels插件
                Chart.register(ChartDataLabels);

                var ctx = document.getElementById('categoryChart').getContext('2d');
                var chart = new Chart(ctx, {{
                    type: 'bar',
                    data: {{
                        labels: {chart_data['labels']},
                        datasets: [
                            {{
                                label: '旧数据',
                                data: {chart_data['old_counts']},
                                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1,
                                datalabels: {{
                                    anchor: 'end',
                                    align: 'top',
                                    color: '#333',
                                    font: {{
                                        weight: 'bold',
                                        size: 14
                                    }},
                                    formatter: function(value) {{
                                        return value;
                                    }}
                                }}
                            }},
                            {{
                                label: '新数据',
                                data: {chart_data['new_counts']},
                                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                                borderColor: 'rgba(255, 99, 132, 1)',
                                borderWidth: 1,
                                datalabels: {{
                                    anchor: 'end',
                                    align: 'top',
                                    color: '#333',
                                    font: {{
                                        weight: 'bold',
                                        size: 14
                                    }},
                                    formatter: function(value) {{
                                        return value;
                                    }}
                                }}
                            }},
                            {{
                                label: '变化量',
                                data: {chart_data['changes']},
                                type: 'line',
                                fill: false,
                                borderColor: 'rgb(75, 192, 192)',
                                backgroundColor: 'rgb(75, 192, 192)',
                                tension: 0.1,
                                yAxisID: 'y1',
                                pointStyle: 'circle',
                                pointRadius: 6,
                                pointHoverRadius: 8,
                                datalabels: {{
                                    anchor: 'center',
                                    align: 'center',
                                    color: '#333',
                                    font: {{
                                        weight: 'bold',
                                        size: 22
                                    }},
                                    formatter: function(value) {{
                                        return value > 0 ? '+' + value : value;
                                    }}
                                }}
                            }}
                        ]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                position: 'top',
                            }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        let label = context.dataset.label || '';
                                        if (label) {{
                                            label += ': ';
                                        }}
                                        if (context.parsed.y !== null) {{
                                            label += context.parsed.y;
                                        }}
                                        return label;
                                    }}
                                }}
                            }},
                            datalabels: {{
                                display: true,
                                color: '#333',
                                anchor: 'end',
                                align: 'top',
                                offset: 2
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                position: 'left',
                                title: {{
                                    display: true,
                                    text: '数量'
                                }}
                            }},
                            y1: {{
                                position: 'right',
                                grid: {{
                                    drawOnChartArea: false
                                }},
                                title: {{
                                    display: true,
                                    text: '变化量'
                                }},
                                ticks: {{
                                    callback: function(value) {{
                                        return value > 0 ? '+' + value : value;
                                    }}
                                }}
                            }},
                            x: {{
                                title: {{
                                    display: true,
                                    text: '品类'
                                }},
                                ticks: {{
                                    callback: function(value, index, values) {{
                                        // 显示所有标签
                                        return this.getLabelForValue(value);
                                    }},
                                    maxRotation: 90,
                                    minRotation: 45
                                }}
                            }}
                        }}
                    }}
                }});
                ''' if comparison_data else ''}
            </script>
        </body>
        </html>
        """

    # 保存最终整合文件
    with open(output_html_merged, 'w', encoding='utf-8') as f:
        f.write(final_html_structure)

    print(f"✅ 整合版报表已生成: {output_html_merged}")
