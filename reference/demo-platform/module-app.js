// ============================================================
// module-app.js — Dynamic rendering logic for all module pages
// ============================================================

// -------------------- SELECT PAGE --------------------
var currentFilter = 'all';

function initSelectPage() {
    renderHeaderBadges();
    renderStats();
    renderTaskTable('all');
    renderStrategies();
}

function renderHeaderBadges() {
    var el = document.getElementById('headerBadges');
    if (!el) return;
    var configuring = MODULE_TASKS.filter(function(t){ return t.status === 'configuring'; }).length;
    var exportable  = MODULE_TASKS.filter(function(t){ return t.status === 'exportable'; }).length;
    el.innerHTML =
        '<span class="step-tag step-tag-blue" style="margin-right:6px;">配置中 ' + configuring + '</span>' +
        '<span class="step-tag step-tag-green">可导出BOM ' + exportable + '</span>';
}

function renderStats() {
    var el = document.getElementById('statsRow');
    if (!el) return;
    var total      = MODULE_TASKS.length;
    var checking   = MODULE_TASKS.filter(function(t){ return t.status === 'checking'; }).length;
    var pending    = MODULE_TASKS.filter(function(t){ return t.status === 'pending'; }).length;
    var exportable = MODULE_TASKS.filter(function(t){ return t.status === 'exportable'; }).length;
    var cards = [
        { label: '配置任务', value: total, dotColor: '#1a6cff' },
        { label: '待校验', value: checking, dotColor: '#e09000' },
        { label: '待确认', value: pending, dotColor: '#e07000' },
        { label: '可导出BOM', value: exportable, dotColor: '#10a060' }
    ];
    el.innerHTML = cards.map(function(c) {
        return '<div class="mstat-card">' +
            '<div class="mstat-label">' + c.label + '</div>' +
            '<div class="mstat-number">' + c.value + '</div>' +
            '<span class="mstat-dot" style="background:' + c.dotColor + ';"></span>' +
            '</div>';
    }).join('');
}

function filterTasks(filter, btn) {
    currentFilter = filter || 'all';
    if (btn) {
        document.querySelectorAll('.filter-tab').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
    }
    renderTaskTable(currentFilter);
}

function renderTaskTable(filter) {
    var tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    var search = (document.getElementById('searchInput') || {value: ''}).value.toLowerCase();
    var list = MODULE_TASKS.filter(function(t) {
        var matchFilter = (filter === 'all') || t.status === filter;
        var matchSearch = !search ||
            t.title.toLowerCase().indexOf(search) >= 0 ||
            t.product.toLowerCase().indexOf(search) >= 0 ||
            t.desc.toLowerCase().indexOf(search) >= 0;
        return matchFilter && matchSearch;
    });
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#bbb;">暂无数据</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(function(t) {
        var statusClass = 'status-' + t.status;
        var dest = (t.status === 'configuring' || t.status === 'pending' || t.status === 'checking')
            ? 'module-platform.html' : 'module-select.html';
        return '<tr>' +
            '<td class="task-name-cell"><div class="task-title">' + t.title + '</div><div class="task-desc">' + t.desc + '</div></td>' +
            '<td style="font-size:13px;">' + t.product + '</td>' +
            '<td><span class="' + statusClass + '">' + t.statusLabel + '</span></td>' +
            '<td style="font-size:13px; color:#888;">' + t.updatedAt + '</td>' +
            '<td><a class="action-link" href="' + dest + '">' + t.action + '</a></td>' +
            '</tr>';
    }).join('');
}

function renderStrategies() {
    var el = document.getElementById('strategiesList');
    if (!el) return;
    el.innerHTML = MODULE_STRATEGIES.map(function(s) {
        return '<div class="strategy-item">' +
            '<div class="s-name">' + s.name + '</div>' +
            '<div class="s-desc">' + s.desc + '</div>' +
            '</div>';
    }).join('');
}

function startNewTask() {
    window.location.href = 'module-platform.html';
}

// -------------------- PLATFORM PAGE --------------------
function initPlatformPage() {
    var d = MODULE_PLATFORM_PARAMS;
    // Category buttons
    var catEl = document.getElementById('categoryBtns');
    if (catEl) {
        catEl.innerHTML = d.productCategories.map(function(c) {
            var active = c === d.selectedCategory ? 'btn btn-primary' : 'btn btn-outline';
            return '<button class="' + active + '" style="padding:6px 14px; font-size:13px;" onclick="selectCategory(this, \'' + c + '\')">' + c + '</button>';
        }).join('');
    }
    // Req source
    var srcEl = document.getElementById('reqSourceText');
    if (srcEl) srcEl.textContent = d.requirementSource;
    // Params, platforms, sidebar rendered after fetchRequirements()
}

function fetchRequirements() {
    var btn = document.querySelector('button[onclick="fetchRequirements()"]');
    if (btn) { btn.textContent = '\u83b7\u53d6\u4e2d...'; btn.disabled = true; }
    setTimeout(function() {
        if (btn) { btn.textContent = '\u5df2\u83b7\u53d6 \u2713'; btn.style.background = '#10a060'; btn.disabled = false; }
        // Show status tags
        var sb = document.getElementById('pageStatusBar');
        if (sb) sb.style.display = 'flex';
        // Show platform params section
        var sp = document.getElementById('sectionParams');
        if (sp) sp.style.display = 'block';
        // Show platform recommendations section
        var spf = document.getElementById('sectionPlatforms');
        if (spf) spf.style.display = 'block';
        // Show confirm button
        var sc = document.getElementById('sectionConfirm');
        if (sc) sc.style.display = 'flex';
        // Show right sidebar
        var rs = document.getElementById('rightSidebar');
        if (rs) rs.style.display = 'flex';
        // Render dynamic content
        renderParamGrid();
        renderPlatformCards();
        renderPlatformSidebar();
    }, 800);
}

function renderParamGrid() {
    var pgEl = document.getElementById('paramGrid');
    if (!pgEl) return;
    pgEl.innerHTML = MODULE_PLATFORM_PARAMS.params.map(function(p) {
        return '<div class="param-item">' +
            '<div class="param-label">' + p.label + '</div>' +
            '<div class="param-value">' + p.value + '<span class="param-arrow">\u25be</span></div>' +
            '</div>';
    }).join('');
}

function renderPlatformSidebar() {
    var d = MODULE_PLATFORM_PARAMS;
    var bd = d.requirementBreakdown;
    var rsEl = document.getElementById('reqSummaryPanel');
    if (rsEl) {
        rsEl.innerHTML =
            '<div style="font-size:13px; font-weight:600; margin-bottom:8px;">\u6574\u673a\u9700\u6c42\u5305</div>' +
            '<div class="req-summary" style="flex-direction:column; gap:6px;">' +
            '<div style="display:flex; justify-content:space-between;"><span style="color:#888;">\u4e0a\u8f66\u5e73\u53f0\u9700\u6c42</span><span class="req-item-val blue">' + (bd.upper || bd.platform) + ' \u9879</span></div>' +
            '<div style="display:flex; justify-content:space-between;"><span style="color:#888;">\u4e0b\u8f66\u5e73\u53f0\u9700\u6c42</span><span class="req-item-val blue">' + (bd.lower || bd.upperLower) + ' \u9879</span></div>' +
            '<div style="display:flex; justify-content:space-between;"><span style="color:#888;">\u7cfb\u7edf\u7ea7\u9700\u6c42</span><span class="req-item-val orange">' + (bd.system || bd.bomNodes) + ' \u9879</span></div>' +
            '<div style="display:flex; justify-content:space-between;"><span style="color:#888;">\u5b50\u7cfb\u7edf\u9700\u6c42</span><span class="req-item-val orange">' + (bd.subsystem || 8) + ' \u9879</span></div>' +
            '<div style="display:flex; justify-content:space-between;"><span style="color:#888;">\u6838\u5fc3\u90e8\u4ef6\u9700\u6c42</span><span class="req-item-val green">' + (bd.core || 12) + ' \u9879</span></div>' +
            '</div>';
    }
    var wEl = document.getElementById('weightBar');
    if (wEl) {
        wEl.innerHTML = d.recommendationWeights.map(function(w) {
            return '<div class="weight-row"><span class="weight-label">' + w.label + '</span><span class="weight-val">' + w.weight + '</span></div>';
        }).join('');
    }
    var fsEl = document.getElementById('flowStepsList');
    if (fsEl) {
        var steps = ['\u786e\u8ba4\u4e00\u7ea7\u5e73\u53f0', '\u63a8\u8350\u4e0a\u8f66\u5e73\u53f0\u4e0e\u4e0b\u8f66\u5e73\u53f0', '\u9009\u4e2d\u4e0a\u8f66\u5e73\u53f0\u65b9\u6848\u540e\u9884\u89c8BOM', '\u8fdb\u5165BOM\u8282\u70b9\u7ef4\u62a4\u5de5\u4f5c\u53f0'];
        fsEl.innerHTML = steps.map(function(s) { return '<li>' + s + '</li>'; }).join('');
    }
}

function renderPlatformCards() {
    var el = document.getElementById('platformCards');
    if (!el) return;
    el.innerHTML = MODULE_PLATFORM_PARAMS.platforms.map(function(p) {
        var selClass = p.selected ? 'plat-card selected' : 'plat-card';
        var matchClass = p.match >= 90 ? 'high' : (p.match >= 80 ? 'mid' : 'low');
        var badgeClass = p.selected ? 'plat-card-badge selected-badge' : 'plat-card-badge candidate-badge';
        return '<div class="' + selClass + '" onclick="selectPlatform(\'' + p.id + '\')">' +
            '<span class="' + badgeClass + '">' + p.badge + '</span>' +
            '<div class="plat-match ' + matchClass + '">匹配 ' + p.match + '%</div>' +
            '<div class="plat-name">' + p.name + '</div>' +
            '<div class="plat-desc">' + p.desc + '</div>' +
            '</div>';
    }).join('');
}

function selectCategory(btn, cat) {
    MODULE_PLATFORM_PARAMS.selectedCategory = cat;
    document.querySelectorAll('#categoryBtns button').forEach(function(b) { b.className = 'btn btn-outline'; b.style.cssText = 'padding:6px 14px; font-size:13px;'; });
    btn.className = 'btn btn-primary';
    btn.style.cssText = 'padding:6px 14px; font-size:13px;';
}

function selectPlatform(id) {
    MODULE_PLATFORM_PARAMS.platforms.forEach(function(p) { p.selected = (p.id === id); p.badge = p.selected ? '已选' : '候选'; });
    renderPlatformCards();
}

// -------------------- SUBSYSTEM PAGE --------------------
// Track current sidebar tab
var currentSidebarTab = 'upper';
// Track selected solutions
var selectedSolutions = { upper: null, lower: null };

function switchSidebarBomTab(prefix) {
    currentSidebarTab = prefix;
    var isUpper = prefix === 'upper';

    // Update tab button styles
    var tabUpper = document.getElementById('sidebarTab-upper');
    var tabLower = document.getElementById('sidebarTab-lower');
    if (tabUpper) {
        tabUpper.style.border = isUpper ? '1.5px solid #10a060' : '1.5px solid #e0e0e0';
        tabUpper.style.background = isUpper ? '#e8f7ef' : '#f7f7f7';
        tabUpper.style.color = isUpper ? '#10a060' : '#888';
        tabUpper.style.fontWeight = isUpper ? '600' : 'normal';
    }
    if (tabLower) {
        tabLower.style.border = !isUpper ? '1.5px solid #1a6cff' : '1.5px solid #e0e0e0';
        tabLower.style.background = !isUpper ? '#f0f5ff' : '#f7f7f7';
        tabLower.style.color = !isUpper ? '#1a6cff' : '#888';
        tabLower.style.fontWeight = !isUpper ? '600' : 'normal';
    }

    // Highlight active section on the left
    var upperSec = document.getElementById('upperSection');
    var lowerSec = document.getElementById('lowerSection');
    if (upperSec) upperSec.style.boxShadow = isUpper ? '0 0 0 2px #10a060' : '';
    if (lowerSec) lowerSec.style.boxShadow = !isUpper ? '0 0 0 2px #1a6cff' : '';

    // Update sidebar title & desc
    var titleEl = document.getElementById('sidebarBomTitle');
    var descEl = document.getElementById('sidebarBomDesc');
    if (titleEl) titleEl.textContent = isUpper ? '上车平台BOM预览' : '下车平台BOM预览';
    if (descEl) descEl.textContent = isUpper
        ? '当前展示上车平台BOM；确认后将形成独立BOM。'
        : '当前展示下车平台BOM；确认后将形成独立BOM。';

    // Update label color
    var labelEl = document.getElementById('bomPreviewLabel');
    if (labelEl) {
        labelEl.style.background = isUpper ? '#f0f5ff' : '#fff7e8';
        labelEl.style.color = isUpper ? '#1a6cff' : '#b06000';
    }

    // Render BOM tree from selected solution of that prefix, or fallback to default
    var platformData = isUpper ? MODULE_SUBSYSTEM_DATA.upperPlatform : MODULE_SUBSYSTEM_DATA.lowerPlatform;
    var selId = selectedSolutions[prefix];
    var sol = selId ? platformData.solutions.find(function(s){ return s.id === selId; }) : platformData.solutions[0];
    if (sol) {
        var bomLabel = document.getElementById('bomPreviewLabel');
        if (bomLabel) bomLabel.innerHTML = '当前演示BOM<br><strong>' + sol.name + '</strong>';
        if (sol.bomPreview) renderBomPreviewTree(sol.bomPreview);
    }
}


function initSubsystemPage() {
    var d = MODULE_SUBSYSTEM_DATA;
    renderSubPlatformSection('upper', d.upperPlatform);
    renderSubPlatformSection('lower', d.lowerPlatform);
    // Default: select the best solution for upper platform and show its BOM
    var defSol = d.upperPlatform.solutions.find(function(s){ return s.status === 'best'; }) || d.upperPlatform.solutions[0];
    if (defSol) selectSubSolution('upper', defSol.id);
}

function renderSubPlatformSection(prefix, data) {
    var paramsEl = document.getElementById(prefix + 'Params');
    if (paramsEl) {
        paramsEl.innerHTML = data.params.map(function(p) {
            return '<div class="sub-param-row"><span class="sub-param-label">' + p.label + '</span><span class="sub-param-val">' + p.value + '</span></div>';
        }).join('');
    }
    var solEl = document.getElementById(prefix + 'Solutions');
    if (solEl) {
        solEl.innerHTML = data.solutions.map(function(s) {
            var cls = s.status === 'best' ? 'sub-solution-row best' : 'sub-solution-row alt';
            var mc  = s.status === 'best' ? 'sub-sol-match best-match' : 'sub-sol-match alt-match';
            return '<div class="' + cls + '" id="sol-' + prefix + '-' + s.id + '" onclick="selectSubSolution(\'' + prefix + '\', \'' + s.id + '\')" style="cursor:pointer;">' +
                '<span class="sub-sol-name"><span class="dot ' + (s.status === 'best' ? 'dot-green' : 'dot-orange') + '"></span>' + s.name + '</span>' +
                '<span class="' + mc + '">' + s.badge + '</span>' +
                '</div>';
        }).join('');
    }
}

function selectSubSolution(prefix, solId) {
    var platformData = prefix === 'upper' ? MODULE_SUBSYSTEM_DATA.upperPlatform : MODULE_SUBSYSTEM_DATA.lowerPlatform;
    var sol = platformData.solutions.find(function(s){ return s.id === solId; });
    if (!sol) return;
    selectedSolutions[prefix] = solId;

    // Highlight selected row, deselect others in same group
    platformData.solutions.forEach(function(s) {
        var el = document.getElementById('sol-' + prefix + '-' + s.id);
        if (el) {
            el.style.background = (s.id === solId) ? (s.status === 'best' ? '#e8f7ef' : '#fff7e8') : '';
            el.style.border = (s.id === solId) ? ('1.5px solid ' + (s.status === 'best' ? '#10a060' : '#f5a623')) : '';
            el.style.borderRadius = (s.id === solId) ? '6px' : '';
        }
    });

    // Update status badge
    var statusEl = document.getElementById(prefix + 'Status');
    if (statusEl) {
        statusEl.textContent = '\u5df2\u9009\u62e9';
        statusEl.className = 'module-badge badge-green';
    }

    // Switch sidebar tab to match the clicked section, and refresh BOM preview
    switchSidebarBomTab(prefix);
}

function renderBomPreviewTree(nodes) {
    var el = document.getElementById('bomPreviewTree');
    if (!el) return;
    el.innerHTML = nodes.map(function(n) {
        var indent = 'bom-node-indent-' + n.level;
        var dotClass = 'dot-' + n.status;
        return '<div class="bom-node ' + indent + '"><span class="dot ' + dotClass + '"></span>' + n.name + '</div>';
    }).join('');
}

// -------------------- BOM WORKBENCH PAGE --------------------
var currentBomState = 'conflict';
var selectedMultiSolutionId = null;
var selectedConflictSolutionId = null;
var selectedUnmatchedSolutionId = null;

function initBomPage() {
    renderBomStats();
    var params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'subsystem') {
        renderBomTree('root');
        var sel = document.getElementById('demoStateSelect');
        if (sel) sel.value = 'conflict';
        currentBomState = 'conflict';
        var center = document.getElementById('centerPanel');
        var right  = document.getElementById('rightPanel');
        if (center) center.innerHTML =
            '<div class="node-panel">' +
            '<div class="node-panel-header"><span class="node-panel-title">上车平台BOM - P8000-SUP</span>' +
            '<span class="module-badge badge-green">已生成</span></div>' +
            '<div class="mod-section-desc">根据子平台推荐结果自动生成的上车平台BOM树。请在左侧选择具体节点进行审查与维护。</div>' +
            '<div class="node-section"><div class="node-section-title">BOM概况</div>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">' +
            '<div class="node-param-item"><div class="node-param-label">全部节点</div><div class="node-param-value">17</div></div>' +
            '<div class="node-param-item"><div class="node-param-label">100%匹配</div><div class="node-param-value" style="color:#10a060;">5</div></div>' +
            '<div class="node-param-item"><div class="node-param-label">多方案节点</div><div class="node-param-value" style="color:#1a6cff;">1</div></div>' +
            '<div class="node-param-item"><div class="node-param-label">未匹配</div><div class="node-param-value" style="color:#e03030;">4</div></div>' +
            '</div></div>' +
            '<div class="node-section" style="background:#f0fff8; border-color:#b0e8d0;"><div class="node-section-title" style="color:#10a060;">建议处理顺序</div>' +
            '<ol style="font-size:13px; color:#555; padding-left:18px; line-height:2;">' +
            '<li>先处理冲突节点：<strong>回转系统</strong></li>' +
            '<li>确认多方案节点：<strong>伸缩液压子系统</strong></li>' +
            '<li>补充未匹配节点参数</li>' +
            '</ol></div>' +
            '<div style="display:flex; gap:8px; padding-top:12px;">' +
            '<button class="btn btn-primary" onclick="clickTreeNode(\x27rot\x27)">开始节点维护</button>' +
            '</div></div>';
        if (right) right.innerHTML =
            '<div class="mod-section-title" style="margin-bottom:8px;">BOM树说明</div>' +
            '<div class="legend-row" style="flex-direction:column; gap:8px;">' +
            '<div class="legend-item"><span class="dot dot-green"></span>100%匹配，无需操作</div>' +
            '<div class="legend-item"><span class="dot dot-blue"></span>多方案，需手动选择</div>' +
            '<div class="legend-item"><span class="dot dot-gray"></span>未匹配，需补充参数</div>' +
            '<div class="legend-item"><span class="dot dot-red"></span>冲突，需解决方案</div>' +
            '</div>';
    } else {
        renderBomTree('rot');  // default active node for conflict state
        switchBomState('conflict', document.getElementById('stateBtn-conflict'));
    }
}

function renderBomStats() {
    var el = document.getElementById('workbenchStats');
    if (!el) return;
    var s = MODULE_BOM_STATS;
    el.innerHTML =
        '<span class="step-tag step-tag-green" style="margin-right:4px;">100% ' + s.match100 + '</span>' +
        '<span class="step-tag step-tag-blue" style="margin-right:4px;">多方案 ' + s.multiSolution + '</span>' +
        '<span class="step-tag step-tag-gray" style="margin-right:4px;">未匹配 ' + s.unmatched + '</span>' +
        '<span class="step-tag" style="background:#fff0f0; color:#e03030; border:1px solid #f0c0c0; margin-right:4px;">冲突 ' + s.conflict + '</span>';
}

function switchBomState(state, btn) {
    currentBomState = state;
    // Sync dropdown if it exists
    var sel = document.getElementById('demoStateSelect');
    if (sel) sel.value = state;
    // Remove old button active states (fallback)
    document.querySelectorAll('[id^="stateBtn-"]').forEach(function(b) { b.classList.remove('active'); });
    var btnEl = document.getElementById('stateBtn-' + state);
    if (btnEl) btnEl.classList.add('active');

    var stateConfig = {
        'conflict':         { nodeId: 'rot',              title: 'BOM节点维护工作台 - 冲突方案推荐',   subtitle: '平台方案确认后，上车平台BOM已载入。当前节点需求与基线BOM冲突，系统直接推荐可解决冲突的候选方案。' },
        'multi':            { nodeId: 'ext-hyd',          title: 'BOM节点维护工作台 - 多方案节点',     subtitle: '当前节点关联需求100%匹配，但存在多个可采用方案；选择方案后预览其下级结构和后续待确认节点。' },
        'unmatched':        { nodeId: 'valve-seq',        title: 'BOM节点维护工作台 - 未匹配节点',     subtitle: '当前节点在BOM结构中存在，但没有匹配到方案；需要补齐关联需求参数后重新推荐。' },
        'unmatched-filled': { nodeId: 'valve-seq-filled', title: 'BOM节点维护工作台 - 未匹配参数补齐推荐', subtitle: '补齐关键需求参数后，系统基于规则库和参数库重新推荐候选方案。' },
        'unique':           { nodeId: 'rot-brg',          title: 'BOM节点维护工作台 - 唯一匹配节点',   subtitle: '当前节点关联需求100%匹配，且只有一个可采用方案；用户确认后继续处理下一状态节点。' }
    };
    var cfg = stateConfig[state];
    var titleEl = document.getElementById('workbenchTitle');
    var subEl   = document.getElementById('workbenchSubtitle');
    if (titleEl) titleEl.textContent = cfg.title;
    if (subEl)   subEl.textContent   = cfg.subtitle;

    // Determine active tree node
    var activeNodeId = (state === 'unmatched-filled') ? 'valve-seq' : cfg.nodeId;
    renderBomTree(activeNodeId);
    renderNodeDetail(cfg.nodeId);
}

function renderBomTree(activeId) {
    var el = document.getElementById('bomTreePanel');
    if (!el) return;
    var statusDotMap = { green: 'dot-green', orange: 'dot-orange', red: 'dot-red', gray: 'dot-gray', blue: 'dot-blue' };
    el.innerHTML = MODULE_BOM_TREE.map(function(n) {
        var indent = 'bom-node-indent-' + n.level;
        var activeClass = (n.id === activeId) ? ' active' : '';
        var dotClass = statusDotMap[n.status] || 'dot-gray';
        return '<div class="bom-node ' + indent + activeClass + '" onclick="clickTreeNode(\'' + n.id + '\')">' +
            '<span class="dot ' + dotClass + '"></span>' + n.name +
            '</div>';
    }).join('');

    // Update hint
    var hintEl = document.getElementById('treeHint');
    if (hintEl) {
        var n = MODULE_BOM_TREE.find(function(x){ return x.id === activeId; });
        if (n) {
            var hints = { green: '绿色唯一匹配', blue: '蓝色多方案，当前展示多方案结构预览。', red: '红色冲突，当前展示冲突解决方案推荐。', gray: '灰色未匹配。' };
            hintEl.textContent = '当前选中：' + n.name + '·' + (hints[n.status] || '');
            hintEl.className = 'selection-hint' + (n.status === 'green' ? ' green-hint' : '');
        }
    }
}

function clickTreeNode(id) {
    renderBomTree(id);
    var detailKey = id;
    if (!MODULE_NODE_DETAILS[id]) {
        // fallback: show generic message
        document.getElementById('centerPanel').innerHTML = '<div style="padding:40px; text-align:center; color:#bbb;"><p>暂无此节点详情</p></div>';
        document.getElementById('rightPanel').innerHTML  = '<div style="padding:40px; text-align:center; color:#bbb;"><p>暂无影响预览</p></div>';
        return;
    }
    renderNodeDetail(detailKey);
}

function renderNodeDetail(nodeId) {
    var detail = MODULE_NODE_DETAILS[nodeId];
    if (!detail) {
        document.getElementById('centerPanel').innerHTML = '<div style="padding:40px; text-align:center; color:#bbb;"><p>暂无此节点详情演示数据</p></div>';
        document.getElementById('rightPanel').innerHTML  = '<div style="padding:40px; text-align:center; color:#bbb;"><p>暂无影响预览</p></div>';
        return;
    }
    switch (detail.type) {
        case 'summary':         renderSummaryDetail(detail); break;
        case 'confirmed':       renderConfirmedDetail(detail); break;
        case 'pending':         renderPendingDetail(detail); break;
        case 'conflict':         renderConflictDetail(detail); break;
        case 'multi':            renderMultiDetail(detail); break;
        case 'unmatched':        renderUnmatchedDetail(detail); break;
        case 'unmatched-filled': renderUnmatchedFilledDetail(detail); break;
        case 'unique':           renderUniqueDetail(detail); break;
    }
    // Show bottom bar
    showBomBottomBar(detail);
}

function renderConflictDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    // Status badge color
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-red">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">中间仅确认当前节点需求参数；系统基于这些参数核基线节点，并推荐可解决冲突的方案。</div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">当前节点需求参数</div>' +
        '<div class="node-section-desc">仅展示回转系统自身的需求参数；参数可编辑，修改后重新核基线节点。</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">' +
        '<div><div style="font-size:12px; color:#888; margin-bottom:6px;">当前需求（基础）</div>' +
        d.currentParamsBasic.map(function(p){ return '<div class="node-param-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '</div></div>'; }).join('') +
        '</div>' +
        '<div><div style="font-size:12px; color:#888; margin-bottom:6px;">当前需求（性能）</div>' +
        d.currentParamsPerf.map(function(p){ return '<div class="node-param-item perf-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '<span class="param-arrow-sm">▾</span></div></div>'; }).join('') +
        '</div></div></div>' +
        '<div class="node-section" style="background:#fff5f5;">' +
        '<div class="node-section-title">基线节点匹配校验</div>' +
        '<div class="mod-section-desc" style="margin-bottom:8px;">当前基线：' + d.baselineInfo + '</div>' +
        '<table class="conflict-table">' +
        d.conflicts.map(function(c){ return '<tr><td>' + c.item + '</td><td>' + c.result + '</td><td class="' + (c.status === 'pass' ? 'conflict-pass' : 'conflict-fail') + '">' + (c.status === 'pass' ? '通过' : '冲突') + '</td></tr>'; }).join('') +
        '</table></div>' +
        '<div id="conflictSolutionsSection" style="display:none;">' +
        '<div class="node-section">' +
        '<div class="node-section-title">冲突解决方案推荐</div>' +
        '<div class="node-section-desc">AI直接推荐落地方案；用户确认方案后，系统内部生成对应BOM变更。</div>' +
        d.solutions.map(function(s){ return '<div class="solution-card ' + (s.recommended ? 'recommended' : '') + '" id="conflictSol-' + s.id + '" onclick="selectSolution(\'' + s.id + '\')" style="cursor:pointer;">' +
            '<div class="solution-card-info"><div class="s-card-name">方案' + s.id + ' ' + s.name + '</div><div class="s-card-desc">' + s.desc + '</div></div>' +
            '<span class="solution-badge ' + (s.recommended ? 'rec' : 'alt') + '">' + (s.recommended ? '推荐' : '备选') + '</span></div>'; }).join('') +
        '</div>' +
        '<div class="node-section"><div class="node-section-title">组件参数计算</div><div style="font-size:13px; color:#666;">AI自动调用回转/液压计算接口；方案A通过参数校核，建议采用。</div></div>' +
        '</div>' +
        '<div style="display:flex; gap:8px; padding-top:12px;">' +
        '<button class="btn btn-primary" id="conflictSearchBtn" onclick="searchConflictSolutions()">搜索方案</button>' +
        '<button class="btn btn-outline" id="conflictConfirmBtn" style="display:none;" onclick="confirmConflictSolution()">确认选中方案</button>' +
        '<button class="btn btn-outline" id="conflictRecomBtn" style="display:none;" onclick="alert(\'重新推荐\')">重新推荐</button>' +
        '</div></div>';

    right.innerHTML =
        '<div id="conflictRightDefault">' +
        '<div class="mod-section-title" style="margin-bottom:6px;">冲突信息</div>' +
        '<div class="mod-section-desc">当前节点与基线BOM冲突，点击“搜索方案”获取推荐解决方案。</div>' +
        '<div style="background:#fff5f5; border-radius:8px; padding:14px; text-align:center; margin-top:12px;">' +
        '<div style="font-size:24px; margin-bottom:8px;">⚠️</div>' +
        '<div style="color:#e03030; font-size:13px; font-weight:600; margin-bottom:4px;">检测到需求冲突</div>' +
        '<div style="color:#888; font-size:12px;">请先点击“搜索方案”按钮获取推荐解决方案</div>' +
        '</div></div>' +
        '<div id="conflictRightResult" style="display:none;">' +
        '<div class="mod-section-title" style="margin-bottom:6px;" id="conflictRightTitle">方案影响预览</div>' +
        '<div class="mod-section-desc">点击左侧方案卡片可切换预览。</div>' +
        '<div class="legend-row" style="margin-bottom:10px; flex-wrap:wrap;">' +
        '<div class="legend-item"><span class="dot dot-green"></span>保留/匹配</div>' +
        '<div class="legend-item"><span class="dot dot-blue"></span>多方案</div>' +
        '<div class="legend-item"><span class="dot dot-gray"></span>待确认</div>' +
        '<div class="legend-item"><span class="dot dot-red"></span>冲突</div>' +
        '</div>' +
        '<div id="conflictImpactContent">' +
        '<div style="background:#f5f5f5; border-radius:8px; padding:20px; text-align:center;">' +
        '<div style="font-size:24px; margin-bottom:8px;">👆</div>' +
        '<div style="color:#888; font-size:13px;">请点击左侧方案卡片查看影响预览</div>' +
        '</div>' +
        '</div>' +
        '</div>';
}

function searchConflictSolutions() {
    var btn = document.getElementById('conflictSearchBtn');
    if (btn) { btn.textContent = '\u641c\u7d22\u4e2d...'; btn.disabled = true; }
    setTimeout(function() {
        var solSection = document.getElementById('conflictSolutionsSection');
        if (solSection) solSection.style.display = 'block';
        var confirmBtn = document.getElementById('conflictConfirmBtn');
        if (confirmBtn) confirmBtn.style.display = 'inline-block';
        var recomBtn = document.getElementById('conflictRecomBtn');
        if (recomBtn) recomBtn.style.display = 'inline-block';
        if (btn) { btn.textContent = '\u5df2\u641c\u7d22 \u2713'; btn.style.background = '#10a060'; btn.disabled = false; }
        var defaultEl = document.getElementById('conflictRightDefault');
        if (defaultEl) defaultEl.style.display = 'none';
        var resultEl = document.getElementById('conflictRightResult');
        if (resultEl) resultEl.style.display = 'block';
        // No auto-select — user clicks to choose
    }, 800);
}

function renderMultiDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-blue">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">' + d.baselineDesc + '</div>' +
        '<div class="node-section"><div class="node-section-title">1 当前节点需求参数</div>' +
        '<div class="node-section-desc">仅展示伸缩液压子系统自身的需求参数；参数可编辑，修改参数后可重新推荐方案。</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">' +
        '<div><div style="font-size:12px; color:#888; margin-bottom:6px;">当前需求（基础）</div>' +
        d.currentParamsBasic.map(function(p){ return '<div class="node-param-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '</div></div>'; }).join('') +
        '</div>' +
        '<div><div style="font-size:12px; color:#888; margin-bottom:6px;">当前需求（性能）</div>' +
        d.currentParamsPerf.map(function(p){ return '<div class="node-param-item perf-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '<span class="param-arrow-sm">▾</span></div></div>'; }).join('') +
        '</div></div></div>' +
        '<div class="node-section"><div class="node-section-title">2 当前节点方案推荐</div>' +
        '<div class="node-section-desc">请点击选择一个方案，右侧将展示对应方案的影响预览与下级需求。</div>' +
        d.solutions.map(function(s){ return '<div class="solution-card" id="multiSol-' + s.id + '" onclick="selectMultiSolution(\'' + s.id + '\')" style="cursor:pointer;">' +
            '<div class="solution-card-info"><div class="s-card-name">方案' + s.id + ' ' + s.name + '</div><div class="s-card-desc">' + s.desc + '</div></div>' +
            '<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#10a060;">' + s.match + '%</span>' +
            '<span class="solution-badge alt">' + s.badge + '</span></div></div>'; }).join('') +
        '</div>' +
        '<div class="node-section"><div class="node-section-title">3 选择方案后预览影响</div>' +
        '<div style="font-size:13px; color:#666;">选择方案后，右侧预览目标型号、下级结构影响与后续节点需求。</div></div>' +
        '<div style="display:flex; gap:8px; padding-top:12px;">' +
        '<button class="btn btn-outline" onclick="recalcMultiParams()">重新计算参数</button>' +
        '<button class="btn btn-primary" id="multiConfirmBtn" onclick="confirmMultiSolution()" disabled>确认选中方案</button>' +
        '</div></div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;" id="multiRightTitle">方案影响与下级需求</div>' +
        '<div class="mod-section-desc">点击左侧方案卡片选择，右侧将展示对应方案的影响预览。</div>' +
        '<div class="legend-row" style="margin-bottom:10px;">' +
        '<div class="legend-item"><span class="dot dot-green"></span>已匹配</div>' +
        '<div class="legend-item"><span class="dot dot-blue"></span>多方案</div>' +
        '<div class="legend-item"><span class="dot dot-gray"></span>未匹配</div>' +
        '<div class="legend-item"><span class="dot dot-red"></span>冲突</div>' +
        '</div>' +
        '<div id="multiImpactContent">' +
        '<div style="background:#f5f5f5; border-radius:8px; padding:20px; text-align:center;">' +
        '<div style="font-size:24px; margin-bottom:8px;">👆</div>' +
        '<div style="color:#888; font-size:13px;">请点击左侧方案卡片选择方案</div>' +
        '</div></div>';
}

function renderUnmatchedDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    center.innerHTML =
        '<div class="node-panel">' +
        '<input type="hidden" id="currentUnmatchedNodeId" value="' + d.nodeId + '">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-gray">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">' + d.desc + '</div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">当前节点关联需求参数（待补录）</div>' +
        '<div class="node-section-desc">请填写以下参数，补录后点击“重新推荐方案”获取候选方案。</div>' +
        '<div class="node-param-grid">' +
        d.params.map(function(p, i){ return '<div class="node-param-item pending-params-box" style="background:#f8f8f8;"><div class="node-param-label">' + p.label + '</div>' +
            '<input type="text" id="unmatchedParam-' + i + '" placeholder="\u5f85\u586b\u5199" style="border:1px solid #ddd; border-radius:6px; padding:4px 8px; font-size:13px; color:#333; width:100%; box-sizing:border-box; background:#fff;" value="' + (p.value || '') + '">' +
            '</div>'; }).join('') +
        '</div></div>' +
        '<div class="node-section" style="background:#fff5f5;">' +
        '<div class="node-section-title">未匹配原因</div>' +
        '<div style="font-size:13px; color:#e03030; margin-bottom:8px;">' + d.unmatchedReason + '</div>' +
        '<div style="font-size:12px; color:#888;">' + d.unmatchedHint + '</div></div>' +
        '<div id="unmatchedSolutionsSection" style="display:none;">' +
        '<div class="node-section"><div class="node-section-title">推荐方案</div>' +
        '<div class="node-section-desc">参数补齐后，系统推荐以下候选方案，请选择一个方案。</div>' +
        '<div id="unmatchedSolutionCards"></div></div>' +
        '</div>' +
        '<div style="display:flex; gap:8px; padding-top:12px;">' +
        '<button class="btn btn-primary" id="unmatchedRecomBtn" onclick="recommendUnmatchedSolutions()">重新推荐方案</button>' +
        '<button class="btn btn-outline" id="unmatchedConfirmBtn" style="display:none;" onclick="confirmUnmatchedSolution()">确认选中方案</button>' +
        '<button class="btn btn-outline" onclick="clearUnmatchedParams()">\u6e05\u7a7a\u53c2\u6570</button>' +
        '</div></div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;">\u5f85\u63a8\u8350\u65b9\u6848</div>' +
        '<div class="mod-section-desc">\u8865\u9f50\u4e2d\u95f4\u53c2\u6570\u540e\uff0c\u8fd9\u91cc\u5c55\u793a\u63a8\u8350\u578b\u53f7\u3001\u64cd\u4f5c\u5efa\u8bae\u548c\u4e0b\u7ea7\u7ed3\u6784\u5f71\u54cd\u3002</div>' +
        '<div id="unmatchedRightContent">' +
        '<div style="background:#f5f5f5; border-radius:8px; padding:16px; text-align:center;">' +
        '<div style="color:#bbb; font-size:13px; margin-bottom:8px;">\u5c1a\u672a\u5339\u914d\u65b9\u6848</div>' +
        '<div style="font-size:12px; color:#888; line-height:1.8;">\u8bf7\u5148\u5728\u4e2d\u95f4\u8865\u5f55\u53c2\u6570\uff0c\u518d\u70b9\u51fb\u201c\u91cd\u65b0\u63a8\u8350\u65b9\u6848\u201d\u3002<br>1. \u8865\u9f50\u53c2\u6570<br>2. \u89e6\u53d1\u63a8\u8350<br>3. \u9009\u62e9\u65b9\u6848</div>' +
        '</div></div>' +
        '<div style="margin-top:14px; font-weight:600; font-size:13px; margin-bottom:8px;">\u5f53\u524dBOM\u5360\u4f4d</div>' +
        d.bomPosition.map(function(n){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-gray"></span>' + n.name + '</div>'; }).join('');
}

function renderUnmatchedFilledDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-gray">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">参数已补齐，系统可进入推荐计算，并展示推荐型号与下级结构影响。</div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">当前节点关联需求参数（已补齐）</div>' +
        '<div class="node-section-desc">工程师补录关键参数后，系统重新检索规则库、参数库和相似配置。</div>' +
        '<div class="node-param-grid">' +
        d.params.map(function(p){ return '<div class="node-param-item perf-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '<span class="param-arrow-sm">▾</span></div></div>'; }).join('') +
        '</div></div>' +
        '<div class="node-section" style="background:#f0fff8; border-color:#b0e8d0;">' +
        '<div class="node-section-title">参数补齐结果</div>' +
        '<div style="font-size:13px; color:#10a060; font-weight:500; margin-bottom:4px;">阀组流量、压力等级、接口规格等关键参数已补齐。</div>' +
        '<div style="font-size:12px; color:#888;">系统已重新检索参数数据库/规则库，并生成可选候选方案。</div></div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">组件参数计算</div>' +
        '<div style="font-size:13px; color:#1a6cff;">已调用组件参数计算接口，推荐结果可继续进入方案确认。</div></div>' +
        '<div style="display:flex; gap:8px; padding-top:12px;">' +
        '<button class="btn btn-primary" onclick="confirmUnmatchedFilledSolution()">确认采用方案</button>' +
        '<button class="btn btn-outline" onclick="alert(\'参数已清空\')">清空参数</button>' +
        '</div></div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;">推荐方案</div>' +
        '<div class="mod-section-desc">根据补齐参数，系统生成候选型号、操作建议和下级结构影响。</div>' +
        '<div style="border:1.5px solid #1a6cff; border-radius:10px; padding:14px; background:#f0f5ff; margin-bottom:14px;">' +
        '<div style="font-size:12px; color:#888; margin-bottom:4px;">推荐方案 A <span style="background:#1a6cff; color:#fff; padding:2px 8px; border-radius:6px; font-size:11px; margin-left:4px;">推荐</span></div>' +
        '<div style="font-size:20px; font-weight:700; color:#1a6cff;">' + d.recommendedSolution.name + '</div>' +
        '<div style="font-size:12px; color:#666; margin-top:4px;">' + d.recommendedSolution.desc + '</div>' +
        '</div>' +
        '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">推荐后BOM影响</div>' +
        d.impact.map(function(n){ var s = n.status; return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-' + s + '"></span>' + n.name + '</div>'; }).join('');
}

function renderUniqueDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-green">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">' + d.desc + '</div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">当前节点关联需求参数（可编辑）</div>' +
        '<div class="node-section-desc">只展示与回转支承组件相关的参数，而不是整机全部需求。</div>' +
        '<div class="node-param-grid">' +
        d.params.map(function(p){ return '<div class="node-param-item perf-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '<span class="param-arrow-sm">▾</span></div></div>'; }).join('') +
        '</div></div>' +
        '<div class="node-section" style="background:#f0fff8; border-color:#b0e8d0;">' +
        '<div class="node-section-title">基线节点匹配校验</div>' +
        '<div style="font-size:12px; color:#888; margin-bottom:8px;">当前基线：' + d.baseline.id + ' / ' + d.baseline.name + '</div>' +
        '<table class="conflict-table">' +
        d.baselineChecks.map(function(c){ return '<tr><td>' + c.item + '</td><td>' + c.result + '</td><td class="conflict-pass">' + (c.note || '通过') + '</td></tr>'; }).join('') +
        '</table></div>' +
        '<div class="node-section"><div class="node-section-title">组件参数计算</div>' +
        '<div style="font-size:13px; color:#666;">' + d.calcResult + '</div>' +
        '</div>' +
        '<div style="display:flex; gap:8px; padding-top:12px;">' +
        '<button class="btn btn-primary" onclick="alert(\'节点已确认\')">确认当前节点</button>' +
        '<button class="btn btn-outline" onclick="alert(\'重新校核\')">重新校核</button>' +
        '</div></div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;">唯一方案预览</div>' +
        '<div class="mod-section-desc">该节点只有一个可采用方案，确认后不改变BOM层级，只锁定型号。</div>' +
        '<div style="background:#e6f9f0; border:1.5px solid #a0d8b8; border-radius:10px; padding:14px; margin-bottom:14px;">' +
        '<div style="font-size:12px; color:#888; margin-bottom:4px;">锁定型号</div>' +
        '<div style="font-size:22px; font-weight:700; color:#10a060;">' + d.baseline.id + '</div>' +
        '<div style="font-size:12px; color:#666; margin-top:4px;">名称：' + d.baseline.name + '<br>版本：' + d.baseline.version + '</div>' +
        '</div>' +
        '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">下级结构预览</div>' +
        d.downstreamPreview.map(function(n){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-' + n.status + '"></span>' + n.name + '</div>'; }).join('') +
        '<div style="background:#f5f9ff; border-radius:8px; padding:10px 14px; margin-top:14px; font-size:12px; color:#666;">' +
        '<strong>下一步</strong><br>确认当前节点后，系统自动跳转到未匹配或多方案节点继续逐层维护。</div>' +
        '<button class="btn btn-primary" style="width:100%; margin-top:12px; padding:10px;" onclick="alert(\'跳转到下一节点\')">确认并跳到下一节点</button>';
}

function renderSummaryDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    var ss = d.summaryStats;
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前BOM：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-blue">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">' + d.desc + '</div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">BOM状态概览</div>' +
        '<div style="display:flex; gap:12px; margin-top:8px;">' +
        '<span class="step-tag step-tag-green">100%匹配 ' + ss.green + '</span>' +
        '<span class="step-tag step-tag-blue">多方案 ' + ss.blue + '</span>' +
        '<span class="step-tag step-tag-gray">未匹配 ' + ss.gray + '</span>' +
        '<span class="step-tag" style="background:#fff0f0; color:#e03030; border:1px solid #f0c0c0;">冲突 ' + ss.red + '</span>' +
        '</div></div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">一级子节点</div>' +
        d.children.map(function(c){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0; cursor:pointer;" onclick="clickTreeNode(\'' + c.status + '\')"><span class="dot dot-' + c.status + '"></span>' + c.name + ' <span style="font-size:12px; color:#888;">' + c.detail + '</span></div>'; }).join('') +
        '</div></div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;">BOM结构总览</div>' +
        '<div class="mod-section-desc">点击左侧BOM树节点查看各子系统状态与处理方案。</div>' +
        '<div class="legend-row" style="margin-bottom:10px;">' +
        '<div class="legend-item"><span class="dot dot-green"></span>已匹配</div>' +
        '<div class="legend-item"><span class="dot dot-blue"></span>多方案</div>' +
        '<div class="legend-item"><span class="dot dot-gray"></span>未匹配</div>' +
        '<div class="legend-item"><span class="dot dot-red"></span>冲突</div>' +
        '</div>' +
        '<div style="background:#f5f9ff; border-radius:8px; padding:14px; margin-bottom:14px; font-size:13px;">' +
        '<strong>\u64cd\u4f5c\u6307\u5f15</strong><br><span style="color:#888;">1. \u5148\u5904\u7406\u7ea2\u8272\u51b2\u7a81\u8282\u70b9<br>2. \u518d\u786e\u8ba4\u84dd\u8272\u591a\u65b9\u6848\u8282\u70b9<br>3. \u8865\u5f55\u7070\u8272\u672a\u5339\u914d\u8282\u70b9\u53c2\u6570<br>4. \u5168\u90e8\u5904\u7406\u5b8c\u540e\u751f\u6210BOM</span></div>' +
        '<div style="display:flex; gap:8px; margin-top:12px;">' +
        '<button class="btn btn-primary" style="font-size:12px;" onclick="window.location.href=\'module-bom-confirm.html\'">\u524d\u5f80BOM\u786e\u8ba4\u9875</button>' +
        '</div>';
}

function renderConfirmedDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-green">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">' + d.desc + '</div>' +
        '<div class="node-section" style="background:#f0fff8; border-color:#b0e8d0;">' +
        '<div class="node-section-title">基线匹配信息</div>' +
        '<div style="font-size:13px; color:#10a060; font-weight:500; margin-bottom:6px;">' + d.baseline.id + ' / ' + d.baseline.name + '</div>' +
        '<div style="font-size:12px; color:#888;">版本：' + d.baseline.version + '</div></div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">当前节点关联参数</div>' +
        '<div class="node-param-grid">' +
        d.params.map(function(p){ return '<div class="node-param-item"><div class="node-param-label">' + p.label + '</div><div class="node-param-value">' + p.value + '</div></div>'; }).join('') +
        '</div></div>' +
        (d.children && d.children.length > 0 ?
        '<div class="node-section"><div class="node-section-title">下级节点</div>' +
        d.children.map(function(c){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-' + c.status + '"></span>' + c.name + ' <span style="font-size:12px; color:#888;">' + c.detail + '</span></div>'; }).join('') +
        '</div>' : '') +
        '<div style="display:flex; gap:8px; padding-top:12px;">' +
        '<button class="btn btn-primary" onclick="alert(\'\u8282\u70b9\u5df2\u786e\u8ba4\')">\u786e\u8ba4\u5f53\u524d\u8282\u70b9</button>' +
        '<button class="btn btn-outline" onclick="alert(\'\u91cd\u65b0\u6821\u6838\')">\u91cd\u65b0\u6821\u6838</button>' +
        '</div></div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;">节点确认信息</div>' +
        '<div class="mod-section-desc">该节点已确认匹配，无需额外操作。</div>' +
        '<div style="background:#e6f9f0; border:1.5px solid #a0d8b8; border-radius:10px; padding:14px; margin-bottom:14px;">' +
        '<div style="font-size:12px; color:#888; margin-bottom:4px;">已锁定型号</div>' +
        '<div style="font-size:20px; font-weight:700; color:#10a060;">' + d.baseline.id + '</div>' +
        '<div style="font-size:12px; color:#666; margin-top:4px;">名称：' + d.baseline.name + '</div>' +
        '</div>' +
        (d.children && d.children.length > 0 ?
        '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">下级节点状态</div>' +
        d.children.map(function(c){ return '<div style="display:flex; align-items:center; gap:6px; padding:4px 0;"><span class="dot dot-' + c.status + '" style="width:8px; height:8px;"></span><span style="font-size:12px;">' + c.name + '</span><span style="font-size:11px; color:#888; margin-left:auto;">' + c.detail + '</span></div>'; }).join('')
        : '<div style="text-align:center; color:#bbb; font-size:12px; padding:20px 0;">无下级节点，叶节点已确认</div>') +
        '<div style="font-size:12px; color:#888; background:#f5f9ff; border-radius:8px; padding:10px; margin-top:14px;"><strong>下一步</strong><br>确认当前节点后，系统自动跳转到下一个待处理节点。</div>' +
        '<button class="btn btn-primary" style="width:100%; margin-top:12px; padding:10px;" onclick="alert(\'跳转到下一节点\')">确认并跳到下一节点</button>';
}

function renderPendingDetail(d) {
    var center = document.getElementById('centerPanel');
    var right  = document.getElementById('rightPanel');
    center.innerHTML =
        '<div class="node-panel">' +
        '<div class="node-panel-header"><span class="node-panel-title">当前节点：' + d.nodeName + '</span>' +
        '<span class="module-badge badge-gray">' + d.statusLabel + '</span></div>' +
        '<div class="mod-section-desc">' + d.desc + '</div>' +
        '<div class="node-section">' +
        '<div class="node-section-title">关联需求参数（待确认）</div>' +
        '<div class="node-section-desc">该节点参数需等待上级节点确认后自动填充。</div>' +
        '<div class="node-param-grid">' +
        d.params.map(function(p){ return '<div class="node-param-item" style="background:#f8f8f8;"><div class="node-param-label">' + p.label + '</div><div class="node-param-value" style="color:#bbb;">' + p.value + '</div></div>'; }).join('') +
        '</div></div>' +
        '<div class="node-section" style="background:#fff5f5;">' +
        '<div class="node-section-title">未匹配原因</div>' +
        '<div style="font-size:13px; color:#e07000;">' + d.pendingReason + '</div></div>' +
        '</div>';

    right.innerHTML =
        '<div class="mod-section-title" style="margin-bottom:6px;">待匹配</div>' +
        '<div class="mod-section-desc">该节点需等待上级方案确认后自动匹配。</div>' +
        '<div style="background:#f5f5f5; border-radius:8px; padding:20px; text-align:center;">' +
        '<div style="font-size:24px; margin-bottom:8px;">⏳</div>' +
        '<div style="color:#888; font-size:13px;">等待上级节点确认</div>' +
        '</div>' +
        '<div style="font-size:12px; color:#888; margin-top:14px; line-height:1.8;">' +
        '<strong>\u64cd\u4f5c\u5efa\u8bae</strong><br>1. \u5148\u786e\u8ba4\u4e0a\u7ea7\u8282\u70b9\u65b9\u6848<br>2. \u672c\u8282\u70b9\u53c2\u6570\u5c06\u81ea\u52a8\u586b\u5145<br>3. \u7cfb\u7edf\u81ea\u52a8\u63a8\u8350\u5339\u914d\u65b9\u6848</div>' +
        '<div style="display:flex; gap:8px; margin-top:14px;">' +
        '<button class="btn btn-outline" style="font-size:12px;" onclick="alert(\'\u7b49\u5f85\u4e0a\u7ea7\u786e\u8ba4\')">\u7b49\u5f85\u4e0a\u7ea7\u786e\u8ba4</button>' +
        '</div>';
}

function selectSolution(id) {
    selectedConflictSolutionId = id;
    var d = MODULE_NODE_DETAILS['rot'];
    if (!d || !d.solutions) return;
    // Highlight selected card, dim others
    d.solutions.forEach(function(s) {
        var el = document.getElementById('conflictSol-' + s.id);
        if (el) {
            if (s.id === id) {
                el.style.border = '2px solid #1a6cff';
                el.style.background = '#f0f5ff';
                el.style.boxShadow = '0 2px 8px rgba(26,108,255,0.15)';
            } else {
                el.style.border = '1px solid #e8e8e8';
                el.style.background = '#fff';
                el.style.boxShadow = 'none';
            }
        }
    });
    // Enable confirm button once a solution is selected
    var confirmBtn = document.getElementById('conflictConfirmBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.className = 'btn btn-primary';
    }
    // Update right panel impact preview
    var sol = d.solutions.find(function(s) { return s.id === id; });
    if (sol && sol.impact) {
        var titleEl = document.getElementById('conflictRightTitle');
        if (titleEl) titleEl.textContent = '\u65b9\u6848' + id + '\u5f71\u54cd\u9884\u89c8';
        var contentEl = document.getElementById('conflictImpactContent');
        if (contentEl) {
            contentEl.innerHTML =
                '<div class="info-card" style="padding:12px; margin-bottom:12px;">' +
                '<div style="font-size:12px; font-weight:600; margin-bottom:4px;">\u65b9\u6848' + id + '\u6458\u8981</div>' +
                '<div style="font-size:12px; color:#1a6cff;">' + sol.impact.summary + '</div></div>' +
                '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">\u65b9\u6848' + id + '\u7ed3\u6784\u5f71\u54cd</div>' +
                sol.impact.nodes.map(function(n){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-' + n.status + '"></span>' + n.name + '</div>'; }).join('') +
                '<div style="font-weight:600; font-size:13px; margin:12px 0 8px;">\u65b9\u6848\u5e26\u51fa\u4e0b\u7ea7\u9700\u6c42</div>' +
                '<div style="font-size:12px; color:#1a6cff; margin-bottom:8px;">' + sol.impact.downstream + '</div>' +
                '<div style="font-size:12px; color:#888; background:#f9f9f9; border-radius:8px; padding:10px; margin-top:8px;"><strong>\u786e\u8ba4\u540e</strong><br>\u786e\u8ba4\u9009\u4e2d\u65b9\u6848\uff1b\u6700\u7ec8BOM\u5728\u786e\u8ba4\u9875\u751f\u6210\u3002</div>';
        }
    }
}

function confirmConflictSolution() {
    if (!selectedConflictSolutionId) return;
    var d = MODULE_NODE_DETAILS['rot'];
    var sol = d.solutions.find(function(s) { return s.id === selectedConflictSolutionId; });
    if (!sol) return;

    // Status maps per solution for rot BOM nodes
    var statusMaps = {
        'A': { 'rot': 'green', 'rot-hyd': 'blue', 'rot-brg': 'green', 'rot-brake': 'blue', 'rot-lub': 'gray' },
        'B': { 'rot': 'green', 'rot-hyd': 'green', 'rot-brg': 'green', 'rot-brake': 'green', 'rot-lub': 'gray' }
    };
    var nodeStatusMap = statusMaps[selectedConflictSolutionId] || statusMaps['A'];

    // Patch MODULE_BOM_TREE
    MODULE_BOM_TREE.forEach(function(node) {
        if (nodeStatusMap[node.id] !== undefined) {
            node.status = nodeStatusMap[node.id];
        }
        if (node.id === 'rot') {
            node.name = '回转系统（' + sol.name + '）';
        }
    });

    // Re-render BOM tree with rot active
    renderBomTree('rot');

    // Update confirm button to confirmed state
    var confirmBtn = document.getElementById('conflictConfirmBtn');
    if (confirmBtn) {
        confirmBtn.textContent = '✓ 已确认：' + sol.name;
        confirmBtn.disabled = true;
        confirmBtn.style.background = '#10a060';
        confirmBtn.style.borderColor = '#10a060';
    }

    // Update right panel with confirmed result
    var titleEl = document.getElementById('conflictRightTitle');
    if (titleEl) titleEl.textContent = '方案已确认';
    var contentEl = document.getElementById('conflictImpactContent');
    if (contentEl) {
        contentEl.innerHTML =
            '<div style="background:#e6f9f0; border:1.5px solid #52c41a; border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:12px;">' +
            '<div style="font-weight:600; color:#10a060; margin-bottom:4px;">✅ 方案已确认</div>' +
            '<div style="color:#555;">' + sol.name + '</div>' +
            '</div>' +
            '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">BOM树已更新</div>' +
            sol.impact.nodes.map(function(n) {
                return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;">' +
                    '<span class="dot dot-' + n.status + '"></span>' + n.name + '</div>';
            }).join('') +
            '<div style="font-size:12px; background:#f5f5f5; border-radius:8px; padding:10px 14px; margin-top:12px; color:#666;">' +
            '下一步：处理回转系统下级待确认节点。</div>';
    }
}

function selectMultiSolution(id) {
    selectedMultiSolutionId = id;
    var d = MODULE_NODE_DETAILS['ext-hyd'];
    if (!d || !d.solutions) return;
    // Highlight selected card, dim others
    d.solutions.forEach(function(s) {
        var el = document.getElementById('multiSol-' + s.id);
        if (el) {
            if (s.id === id) {
                el.style.border = '2px solid #1a6cff';
                el.style.background = '#f0f5ff';
                el.style.boxShadow = '0 2px 8px rgba(26,108,255,0.15)';
                // Update badge to '已选中'
                var badge = el.querySelector('.solution-badge');
                if (badge) { badge.className = 'solution-badge sel'; badge.textContent = '\u5df2\u9009\u4e2d'; }
            } else {
                el.style.border = '1px solid #e8e8e8';
                el.style.background = '#fff';
                el.style.boxShadow = 'none';
                // Reset badge to '备选'
                var badge = el.querySelector('.solution-badge');
                if (badge) { badge.className = 'solution-badge alt'; badge.textContent = '\u5907\u9009'; }
            }
        }
    });
    // Enable confirm button
    var confirmBtn = document.getElementById('multiConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = false;
    // Update right panel impact preview
    var sol = d.solutions.find(function(s) { return s.id === id; });
    if (sol && sol.impact) {
        var titleEl = document.getElementById('multiRightTitle');
        if (titleEl) titleEl.textContent = '\u65b9\u6848' + id + '\u5f71\u54cd\u4e0e\u4e0b\u7ea7\u9700\u6c42';
        var contentEl = document.getElementById('multiImpactContent');
        if (contentEl) {
            contentEl.innerHTML =
                '<div style="background:#e6f9f0; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px;">' +
                '<strong>\u5f53\u524d\u5df2\u9009\uff1a\u65b9\u6848' + id + '</strong><br><span style="color:#666;">' + sol.impact.summary + '</span></div>' +
                '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">\u65e2\u6709BOM\u7ed3\u6784\u5f71\u54cd\u9884\u89c8</div>' +
                sol.impact.nodes.map(function(n){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-' + n.status + '"></span>' + n.name + '</div>'; }).join('') +
                '<div style="font-weight:600; font-size:13px; margin:12px 0 6px;">\u4e0b\u7ea7\u9700\u6c42\u6458\u8981</div>' +
                '<div style="font-size:12px; color:#1a6cff; line-height:1.8;">' + sol.impact.downstream + '</div>' +
                '<div style="font-size:12px; color:#e07000; margin-top:10px; font-weight:500;">\u4e0b\u4e00\u6b65<br><span style="font-weight:400; color:#888;">\u7ee7\u7eed\u5904\u7406\u5f85\u786e\u8ba4\u7684\u4e0b\u7ea7\u8282\u70b9\u3002</span></div>';
        }
    }
}

function confirmMultiSolution() {
    if (!selectedMultiSolutionId) return;
    var d = MODULE_NODE_DETAILS['ext-hyd'];
    var sol = d.solutions.find(function(s) { return s.id === selectedMultiSolutionId; });
    if (!sol) return;

    // --- Mapping: impact node name keywords → BOM tree node IDs + new status ---
    var solutionNameMap = {
        'A': { nodeName: '顺序伸缩液压系统', childName: '顺序阔组件', childId: 'valve-seq' },
        'B': { nodeName: '同步伸缩液压系统', childName: '同步阔组件', childId: 'valve-seq' },
        'C': { nodeName: '混合伸缩液压系统', childName: '混合控制阔组', childId: 'valve-seq' }
    };
    var mapping = solutionNameMap[selectedMultiSolutionId];

    // Build a status map from impact nodes: BOM node id → status
    // Fixed node id mapping based on known BOM structure
    var nodeStatusMap = {
        'ext-hyd':   'green',   // confirmed
        'cyl':       'green',   // 伸缩油缸组件 · 已匹配
        'valve-seq': sol.id === 'A' ? 'gray' : 'blue',  // A=待确认, B/C=新增
        'pipe2':     'gray',    // 液压管路组件 · 待确认
        'stroke2':   'green',   // 行程检测组件 · 已匹配
        'seal':      'gray'     // 安装密封件 · 待确认
    };

    // Also rename ext-hyd node label in BOM tree to the selected solution name
    MODULE_BOM_TREE.forEach(function(node) {
        if (nodeStatusMap[node.id] !== undefined) {
            node.status = nodeStatusMap[node.id];
        }
        if (node.id === 'ext-hyd') {
            node.name = '伸缩液压子系统（' + sol.name + '）';
        }
    });

    // Re-render the BOM tree with ext-hyd active
    renderBomTree('ext-hyd');

    // Update confirm button to show confirmed state
    var confirmBtn = document.getElementById('multiConfirmBtn');
    if (confirmBtn) {
        confirmBtn.textContent = '✓ 已确认：' + sol.name;
        confirmBtn.disabled = true;
        confirmBtn.style.background = '#10a060';
        confirmBtn.style.borderColor = '#10a060';
    }

    // Update right panel with confirmed state
    var titleEl = document.getElementById('multiRightTitle');
    if (titleEl) titleEl.textContent = '方案已确认';
    var contentEl = document.getElementById('multiImpactContent');
    if (contentEl) {
        contentEl.innerHTML =
            '<div style="background:#e6f9f0; border:1.5px solid #52c41a; border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:12px;">' +
            '<div style="font-weight:600; color:#10a060; margin-bottom:4px;">✅ 方案已确认</div>' +
            '<div style="color:#555;">' + sol.name + '</div>' +
            '</div>' +
            '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">BOM树已更新</div>' +
            sol.impact.nodes.map(function(n) {
                return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;">' +
                    '<span class="dot dot-' + n.status + '"></span>' + n.name + '</div>';
            }).join('') +
            '<div style="font-size:12px; background:#f5f5f5; border-radius:8px; padding:10px 14px; margin-top:12px; color:#666;">' +
            '下一步：处理其余待确认的下级节点（阅隔阀组 / 液压管路 / 密封件）。</div>';
    }
}

function recalcMultiParams() {
    var btn = document.querySelector('.btn.btn-outline[onclick="recalcMultiParams()"]');
    if (btn) { btn.textContent = '计算中...'; btn.disabled = true; }
    setTimeout(function() {
        // Calculated values within standard ranges
        var calcResults = [
            { label: '压力参数', value: '16.5 MPa', status: 'ok', range: '15～18 MPa' },
            { label: '空载伸臂速度', value: '6.2 m/min', status: 'ok', range: '4～8 m/min' },
            { label: '空载缩臂速度', value: '7.1 m/min', status: 'ok', range: '5～9 m/min' },
            { label: '冲击缓冲行程', value: '18 mm', status: 'ok', range: '10～30 mm' }
        ];
        // Find perf param grid and update, or show a result section
        var perfItems = document.querySelectorAll('.node-param-item.perf-item');
        // Show a calc result overlay in center panel
        var centerPanel = document.getElementById('centerPanel');
        var existingCalc = document.getElementById('multiCalcResult');
        if (existingCalc) existingCalc.remove();
        if (centerPanel) {
            var resultDiv = document.createElement('div');
            resultDiv.id = 'multiCalcResult';
            resultDiv.className = 'node-section';
            resultDiv.style.background = '#f0fff8';
            resultDiv.style.borderColor = '#b0e8d0';
            resultDiv.innerHTML =
                '<div class="node-section-title" style="color:#10a060;">✓ 参数计算结果</div>' +
                '<div style="font-size:12px; color:#888; margin-bottom:10px;">各项参数均在标准范围内，可继续选择方案。</div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">' +
                calcResults.map(function(r) {
                    return '<div style="background:#fff; border:1px solid #b0e8d0; border-radius:6px; padding:8px 10px;">' +
                        '<div style="font-size:11px; color:#888; margin-bottom:3px;">' + r.label + ' <span style="color:#aaa;">(范围: ' + r.range + ')</span></div>' +
                        '<div style="font-size:14px; font-weight:600; color:#10a060;">' + r.value +
                        ' <span style="font-size:11px; background:#d4f5e5; color:#10a060; border-radius:4px; padding:1px 6px;">达标</span></div>' +
                        '</div>';
                }).join('') +
                '</div>';
            // Insert before the buttons row (last child of node-panel)
            var nodePanel = centerPanel.querySelector('.node-panel');
            if (nodePanel) {
                var btnRow = nodePanel.querySelector('div[style*="padding-top:12px"]');
                if (btnRow) nodePanel.insertBefore(resultDiv, btnRow);
                else nodePanel.appendChild(resultDiv);
            }
        }
        if (btn) { btn.textContent = '重新计算参数'; btn.disabled = false; }
    }, 900);
}

function recommendUnmatchedSolutions() {
    var nodeIdEl = document.getElementById('currentUnmatchedNodeId');
    var nodeId = nodeIdEl ? nodeIdEl.value : 'valve-seq';
    var d = MODULE_NODE_DETAILS[nodeId];
    if (!d) return;
    // Collect filled params
    var filledCount = 0;
    d.params.forEach(function(p, i) {
        var input = document.getElementById('unmatchedParam-' + i);
        if (input && input.value.trim()) filledCount++;
    });
    if (filledCount === 0) {
        alert('\u8bf7\u5148\u586b\u5199\u81f3\u5c11\u4e00\u4e2a\u53c2\u6570');
        return;
    }
    var btn = document.getElementById('unmatchedRecomBtn');
    if (btn) { btn.textContent = '\u63a8\u8350\u4e2d...'; btn.disabled = true; }
    setTimeout(function() {
        // Show solutions section
        var solSection = document.getElementById('unmatchedSolutionsSection');
        if (solSection) solSection.style.display = 'block';
        // Render solution cards
        var cardsEl = document.getElementById('unmatchedSolutionCards');
        if (cardsEl && d.solutions) {
            cardsEl.innerHTML = d.solutions.map(function(s) {
                return '<div class="solution-card" id="unmatchedSol-' + s.id + '" onclick="selectUnmatchedSolution(\'' + s.id + '\')" style="cursor:pointer;">' +
                    '<div class="solution-card-info"><div class="s-card-name">\u65b9\u6848' + s.id + ' ' + s.name + '</div><div class="s-card-desc">' + s.desc + '</div></div>' +
                    '<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#10a060;">' + s.match + '%</span>' +
                    '<span class="solution-badge alt">' + s.badge + '</span></div></div>';
            }).join('');
        }
        // Show confirm button
        var confirmBtn = document.getElementById('unmatchedConfirmBtn');
        if (confirmBtn) confirmBtn.style.display = 'inline-block';
        if (btn) { btn.textContent = '\u5df2\u63a8\u8350 \u2713'; btn.style.background = '#10a060'; btn.disabled = false; }
        // Update right panel
        var rightContent = document.getElementById('unmatchedRightContent');
        if (rightContent) {
            rightContent.innerHTML =
                '<div style="background:#f0f5ff; border-radius:8px; padding:14px; text-align:center;">' +
                '<div style="font-size:20px; margin-bottom:8px;">\u2705</div>' +
                '<div style="color:#1a6cff; font-size:13px; font-weight:600; margin-bottom:4px;">\u53c2\u6570\u5df2\u8865\u9f50\uff0c\u8bf7\u9009\u62e9\u65b9\u6848</div>' +
                '<div style="color:#888; font-size:12px;">\u70b9\u51fb\u5de6\u4fa7\u65b9\u6848\u5361\u7247\u67e5\u770b\u5f71\u54cd\u9884\u89c8</div>' +
                '</div>';
        }
    }, 800);
}

function selectUnmatchedSolution(id) {
    selectedUnmatchedSolutionId = id;
    var nodeIdEl = document.getElementById('currentUnmatchedNodeId');
    var nodeId = nodeIdEl ? nodeIdEl.value : 'valve-seq';
    var d = MODULE_NODE_DETAILS[nodeId];
    if (!d || !d.solutions) return;
    // Highlight selected card
    d.solutions.forEach(function(s) {
        var el = document.getElementById('unmatchedSol-' + s.id);
        if (el) {
            if (s.id === id) {
                el.style.border = '2px solid #1a6cff';
                el.style.background = '#f0f5ff';
                el.style.boxShadow = '0 2px 8px rgba(26,108,255,0.15)';
                var badge = el.querySelector('.solution-badge');
                if (badge) { badge.className = 'solution-badge sel'; badge.textContent = '\u5df2\u9009\u4e2d'; }
            } else {
                el.style.border = '1px solid #e8e8e8';
                el.style.background = '#fff';
                el.style.boxShadow = 'none';
                var badge = el.querySelector('.solution-badge');
                if (badge) { badge.className = 'solution-badge alt'; badge.textContent = '\u5907\u9009'; }
            }
        }
    });
        // Enable confirm button
    var confirmBtn = document.getElementById('unmatchedConfirmBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.className = 'btn btn-primary';
    }
    // Update right panel with impact
    var sol = d.solutions.find(function(s) { return s.id === id; });
    if (sol && sol.impact) {
        var rightContent = document.getElementById('unmatchedRightContent');
        if (rightContent) {
            rightContent.innerHTML =
                '<div style="background:#e6f9f0; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px;">' +
                '<strong>\u5f53\u524d\u5df2\u9009\uff1a\u65b9\u6848' + id + '</strong><br><span style="color:#666;">' + sol.impact.summary + '</span></div>' +
                '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">\u63a8\u8350\u540eBOM\u5f71\u54cd</div>' +
                sol.impact.nodes.map(function(n){ return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;"><span class="dot dot-' + n.status + '"></span>' + n.name + '</div>'; }).join('') +
                '<div style="font-weight:600; font-size:13px; margin:12px 0 6px;">\u4e0b\u7ea7\u9700\u6c42\u6458\u8981</div>' +
                '<div style="font-size:12px; color:#1a6cff; line-height:1.8;">' + sol.impact.downstream + '</div>' +
                '<div style="font-size:12px; color:#888; background:#f9f9f9; border-radius:8px; padding:10px; margin-top:10px;"><strong>\u786e\u8ba4\u540e</strong><br>\u786e\u8ba4\u9009\u4e2d\u65b9\u6848\uff0c\u7cfb\u7edf\u81ea\u52a8\u66f4\u65b0BOM\u7ed3\u6784\u3002</div>';
        }
    }
}

function confirmUnmatchedFilledSolution() {
    var d = MODULE_NODE_DETAILS['valve-seq-filled'];
    if (!d) return;
    var sol = d.recommendedSolution;
    var nodeId = d.nodeId || 'valve-seq';

    // Update BOM tree node
    MODULE_BOM_TREE.forEach(function(node) {
        if (node.id === nodeId) {
            node.status = 'green';
            if (sol && sol.name) node.name = '顺序阀组组件（' + sol.name + '）';
        }
    });
    renderBomTree(nodeId);

    // Update button
    var btn = document.querySelector('[onclick="confirmUnmatchedFilledSolution()"]');
    if (btn) {
        btn.textContent = '✓ 已确认：' + (sol ? sol.name : '方案A');
        btn.disabled = true;
        btn.style.background = '#10a060';
        btn.style.borderColor = '#10a060';
    }

    // Update right panel
    var right = document.getElementById('rightPanel');
    if (right) {
        right.innerHTML =
            '<div class="mod-section-title" style="margin-bottom:6px;">方案已确认</div>' +
            '<div style="background:#e6f9f0; border:1.5px solid #52c41a; border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:12px;">' +
            '<div style="font-weight:600; color:#10a060; margin-bottom:4px;">✅ 方案已确认</div>' +
            '<div style="color:#555;">' + (sol ? sol.name : '') + ' — ' + (sol ? sol.desc : '') + '</div>' +
            '</div>' +
            '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">BOM树已更新</div>' +
            d.impact.map(function(n) {
                return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;">' +
                    '<span class="dot dot-' + n.status + '"></span>' + n.name + '</div>';
            }).join('') +
            '<div style="font-size:12px; background:#f5f5f5; border-radius:8px; padding:10px 14px; margin-top:12px; color:#666;">' +
            '下一步：处理其余待确认节点。</div>';
    }
}

function confirmUnmatchedSolution() {
    if (!selectedUnmatchedSolutionId) return;
    var nodeIdEl = document.getElementById('currentUnmatchedNodeId');
    var nodeId = nodeIdEl ? nodeIdEl.value : 'valve-seq';
    var d = MODULE_NODE_DETAILS[nodeId];
    if (!d || !d.solutions) return;
    var sol = d.solutions.find(function(s) { return s.id === selectedUnmatchedSolutionId; });
    if (!sol) return;

    // Update the BOM tree node status for the current node
    MODULE_BOM_TREE.forEach(function(node) {
        if (node.id === nodeId) {
            node.status = 'green';
            // Update name with chosen solution name (first impact node gives the renamed label)
            if (sol.impact && sol.impact.nodes && sol.impact.nodes.length > 0) {
                var firstNode = sol.impact.nodes[0];
                // e.g. '顺序阀组件 → VLV-SEQ-31.5' — extract after →
                var arrow = firstNode.name.indexOf('→');
                if (arrow !== -1) {
                    node.name = node.name.split('·')[0].trim() + '（' + firstNode.name.slice(arrow + 1).trim() + '）';
                }
            }
        }
    });

    // Re-render BOM tree with this node active
    renderBomTree(nodeId);

    // Update confirm button to confirmed state
    var confirmBtn = document.getElementById('unmatchedConfirmBtn');
    if (confirmBtn) {
        confirmBtn.textContent = '✓ 已确认：' + sol.name;
        confirmBtn.disabled = true;
        confirmBtn.style.background = '#10a060';
        confirmBtn.style.borderColor = '#10a060';
    }

    // Update right panel with confirmed state
    var rightContent = document.getElementById('unmatchedRightContent');
    if (rightContent) {
        rightContent.innerHTML =
            '<div style="background:#e6f9f0; border:1.5px solid #52c41a; border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:12px;">' +
            '<div style="font-weight:600; color:#10a060; margin-bottom:4px;">✅ 方案已确认</div>' +
            '<div style="color:#555;">' + sol.name + '</div>' +
            '</div>' +
            '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">BOM树已更新</div>' +
            sol.impact.nodes.map(function(n) {
                return '<div class="bom-node bom-node-indent-0" style="padding:5px 0;">' +
                    '<span class="dot dot-' + n.status + '"></span>' + n.name + '</div>';
            }).join('') +
            '<div style="font-size:12px; background:#f5f5f5; border-radius:8px; padding:10px 14px; margin-top:12px; color:#666;">' +
            '下一步：处理其余待确认的未匹配节点。</div>';
    }
}

function clearUnmatchedParams() {
    var nodeIdEl = document.getElementById('currentUnmatchedNodeId');
    var nodeId = nodeIdEl ? nodeIdEl.value : 'valve-seq';
    var d = MODULE_NODE_DETAILS[nodeId];
    if (!d) return;
    d.params.forEach(function(p, i) {
        var input = document.getElementById('unmatchedParam-' + i);
        if (input) input.value = '';
    });
    // Hide solutions section
    var solSection = document.getElementById('unmatchedSolutionsSection');
    if (solSection) solSection.style.display = 'none';
    // Reset right panel
    var rightContent = document.getElementById('unmatchedRightContent');
    if (rightContent) {
        rightContent.innerHTML =
            '<div style="background:#f5f5f5; border-radius:8px; padding:16px; text-align:center;">' +
            '<div style="color:#bbb; font-size:13px; margin-bottom:8px;">\u5c1a\u672a\u5339\u914d\u65b9\u6848</div>' +
            '<div style="font-size:12px; color:#888; line-height:1.8;">\u8bf7\u5148\u586b\u5199\u53c2\u6570\uff0c\u518d\u70b9\u51fb\u201c\u91cd\u65b0\u63a8\u8350\u65b9\u6848\u201d\u3002<br>1. \u8865\u9f50\u53c2\u6570<br>2. \u89e6\u53d1\u63a8\u8350<br>3. \u9009\u62e9\u65b9\u6848</div>' +
            '</div>';
    }
}

function showBomBottomBar(detail) {
    var bar = document.getElementById('bomBottomBar');
    var leftEl  = document.getElementById('bomBottomLeft');
    var rightEl = document.getElementById('bomBottomRight');
    if (!bar) return;
    bar.style.display = 'flex';
    if (leftEl) leftEl.textContent = '当前节点：' + detail.nodeName;
    if (rightEl) {
        rightEl.innerHTML =
            '<button class="btn btn-outline" onclick="window.location.href=\'module-subsystem.html\'">← 返回子平台</button>' +
            '<button class="btn btn-primary" onclick="window.location.href=\'module-bom-confirm.html\'">完成维护 → 生成BOM</button>';
    }
}

// -------------------- BOM CONFIRM PAGE --------------------
function initBomConfirmPage() {
    var d = MODULE_BOM_CONFIRM;
    // Title & desc
    var titleEl = document.getElementById('confirmTitle');
    var descEl  = document.getElementById('confirmDesc');
    if (titleEl) titleEl.textContent = d.title;
    if (descEl)  descEl.textContent  = d.desc;

    // Change summary
    var summaryEl = document.getElementById('changeSummaryBox');
    if (summaryEl) {
        summaryEl.innerHTML =
            '<div class="mod-section-title" style="margin-bottom:10px;">基线BOM → 配置BOM 变更摘要</div>' +
            '<div style="font-size:13px; color:#444; line-height:2;">' +
            '平台基线：' + d.baseline.platform + '<br>' +
            '已替换：' + d.baseline.replaced + '<br>' +
            '已改型：' + d.baseline.reshaped + '<br>' +
            '已补录：' + d.baseline.supplemented +
            '</div>';
    }

    // BOM tree view — use live MODULE_BOM_TREE for status/colors (consistent with workbench)
    var treeEl = document.getElementById('bomConfirmTree');
    if (treeEl) {
        var statusDotMap = { green: 'dot-green', blue: 'dot-blue', orange: 'dot-orange', red: 'dot-red', gray: 'dot-gray' };
        var changeTagMap = {
            'keep':     '<span style="font-size:11px; color:#10a060; margin-left:8px;">沿用</span>',
            'replace':  '<span style="font-size:11px; color:#1a6cff; margin-left:8px;">替换</span>',
            'solution': '<span style="font-size:11px; color:#1a6cff; margin-left:8px;">方案采用</span>',
            'add':      '<span style="font-size:11px; color:#1a6cff; margin-left:8px;">新增</span>',
            'delete':   '<span style="font-size:11px; color:#999; margin-left:8px; text-decoration:line-through;">删除</span>',
            'generate': '<span style="font-size:11px; color:#1a6cff; margin-left:8px;">生成</span>'
        };
        // Build a lookup from bomNodes by name for code/changeType annotations
        var confirmLookup = {};
        d.bomNodes.forEach(function(bn) { confirmLookup[bn.name] = bn; });

        treeEl.innerHTML = MODULE_BOM_TREE.map(function(n) {
            var dotClass = statusDotMap[n.status] || 'dot-gray';
            var indent = 'bom-node-indent-' + n.level;
            // Look up matching confirm node for code + change tag (match by base name)
            var baseName = n.name.replace(/（[^)]*）/, '').trim();
            var bn = confirmLookup[baseName] || confirmLookup[n.name];
            var codeHtml = bn ? '<span style="font-size:11px; color:#999; margin-left:6px; font-family:monospace;">' + bn.code + '</span>' : '';
            var tagHtml  = bn ? (changeTagMap[bn.changeType] || '') : '';
            // Status-based change tag fallback when no static lookup found
            if (!bn) {
                if (n.status === 'green') tagHtml = '<span style="font-size:11px; color:#10a060; margin-left:8px;">已确认</span>';
                else if (n.status === 'blue') tagHtml = '<span style="font-size:11px; color:#1a6cff; margin-left:8px;">待确认</span>';
                else if (n.status === 'gray') tagHtml = '<span style="font-size:11px; color:#999; margin-left:8px;">未匹配</span>';
                else if (n.status === 'red')  tagHtml = '<span style="font-size:11px; color:#e03030; margin-left:8px;">冲突</span>';
            }
            var fontWeight = n.level <= 1 ? 'font-weight:600;' : '';
            return '<div class="bom-node ' + indent + '" style="cursor:default;">' +
                '<span class="dot ' + dotClass + '"></span>' +
                '<span style="' + fontWeight + '">' + n.name + '</span>' +
                codeHtml + tagHtml +
                '</div>';
        }).join('');
    }

    // Calc note
    var calcEl = document.getElementById('calcNote');
    if (calcEl) calcEl.textContent = d.calcNote;

    // Right sidebar checklist
    var checkEl = document.getElementById('confirmChecklist');
    if (checkEl) {
        var s = d.summary;
        checkEl.innerHTML = [
            { label: '平台基线BOM', value: s.platformBaseline, color: '#10a060' },
            { label: '节点改修', value: s.nodeChanges, color: '#e07000' },
            { label: '冲突状态', value: s.conflictStatus, color: '#10a060' },
            { label: '参数计算', value: s.calcStatus, color: '#10a060' },
            { label: '生成目标', value: s.generateTarget, color: '#1a6cff' },
            { label: '变更记录', value: s.changeRecord, color: '#888' }
        ].map(function(item) {
            return '<div style="border-radius:8px; background:#f8f9fb; padding:10px 12px; margin-bottom:8px;">' +
                '<div style="font-size:11px; color:#888; margin-bottom:2px;">' + item.label + '</div>' +
                '<div style="font-size:13px; color:' + item.color + '; font-weight:500;">' + item.value + '</div>' +
                '</div>';
        }).join('');
    }
}

// -------------------- RULES PAGE --------------------
var activeAssetId = null;
var allAssets = [];

function initRulesPage() {
    allAssets = MODULE_RULES_DATA.assets;
    // Header stats
    var statsEl = document.getElementById('rulesHeaderStats');
    if (statsEl) {
        statsEl.innerHTML =
            '<span class="step-tag step-tag-blue" style="margin-right:6px;">规则 ' + MODULE_RULES_DATA.stats.rules + '</span>' +
            '<span class="step-tag step-tag-teal">公式 ' + MODULE_RULES_DATA.stats.formulas + '</span>';
    }
    renderAssetList(allAssets);
    // Auto-select first asset
    selectAsset(allAssets[0].id);
}

function filterAssets(search) {
    var q = search.toLowerCase();
    var filtered = allAssets.filter(function(a) {
        return !q || a.name.toLowerCase().indexOf(q) >= 0 || a.desc.toLowerCase().indexOf(q) >= 0;
    });
    renderAssetList(filtered);
}

function renderAssetList(assets) {
    var el = document.getElementById('assetList');
    if (!el) return;
    el.innerHTML = assets.map(function(a) {
        var activeClass = a.id === activeAssetId ? ' active' : '';
        var statusClass = a.status === 'active' ? 'asset-active' : (a.status === 'pending' ? 'asset-pending' : 'asset-checking');
        return '<div class="asset-item' + activeClass + '" onclick="selectAsset(\'' + a.id + '\')">' +
            '<div class="asset-item-info"><div class="asset-name">' + a.name + '</div><div class="asset-desc">' + a.desc + '</div></div>' +
            '<span class="asset-status ' + statusClass + '">' + a.statusLabel + '</span>' +
            '</div>';
    }).join('');
}

function selectAsset(id) {
    activeAssetId = id;
    // Re-render list to update active state
    var el = document.getElementById('assetList');
    if (el) {
        el.querySelectorAll('.asset-item').forEach(function(item) {
            if (item.onclick && item.onclick.toString().indexOf(id) >= 0) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    renderAssetList(allAssets);  // re-render to apply active class

    // Show detail
    var detail = MODULE_RULES_DATA.ruleDetail;
    var panel  = document.getElementById('ruleDetailPanel');
    if (!panel) return;

    // Update active id for correct asset
    var asset = allAssets.find(function(a){ return a.id === id; });
    if (!asset) return;
    activeAssetId = id;

    var statusClass = asset.status === 'active' ? 'badge-green' : (asset.status === 'pending' ? 'badge-orange' : 'badge-orange');
    panel.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
        '<div class="mod-section-title">规则详情：' + (id === 'rule-1' ? detail.name : asset.name) + '</div>' +
        '<span class="module-badge ' + statusClass + '">' + asset.statusLabel + '</span>' +
        '</div>' +
        (id === 'rule-1' ? renderRuleFullDetail(detail) : renderSimpleAssetDetail(asset)) +
        '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:20px; padding-top:16px; border-top:1px solid #f0f0f0;">' +
        '<button class="btn btn-outline" onclick="alert(\'操作取消\')">取消</button>' +
        '<button class="btn btn-primary" onclick="alert(\'配置已保存\')">保存配置</button>' +
        '</div>';
}

function renderRuleFullDetail(d) {
    return '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">适用产品</div>' +
        '<div class="rule-detail-content">' +
        d.applicableProducts.map(function(p){ return '<span class="rule-product-tag">' + p + '</span>'; }).join('') +
        '</div></div>' +
        '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">推荐路径</div>' +
        '<div class="rule-detail-content">' + d.recommendPath + '</div>' +
        '</div>' +
        '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">策略与算法</div>' +
        '<div class="rule-detail-content">' + d.strategyAlgorithm + '</div>' +
        '</div>' +
        '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">关联公式库</div>' +
        '<div class="rule-detail-content">' + d.relatedFormulas + '</div>' +
        '</div>' +
        '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">基线与知识图谱</div>' +
        '<div class="rule-detail-content">' + d.baselineKnowledge + '</div>' +
        '</div>';
}

function renderSimpleAssetDetail(asset) {
    return '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">资产说明</div>' +
        '<div class="rule-detail-content">' + asset.desc + '</div>' +
        '</div>' +
        '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">当前状态</div>' +
        '<div class="rule-detail-content">' + asset.statusLabel + '，可正常使用。</div>' +
        '</div>' +
        '<div class="rule-detail-section">' +
        '<div class="rule-detail-label">操作说明</div>' +
        '<div class="rule-detail-content">管理员可在此配置和更新该资产；修改后保存生效。</div>' +
        '</div>';
}
