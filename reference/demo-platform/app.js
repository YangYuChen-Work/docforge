// DEMO演示平台 - 前端交互逻辑

// ==================== Tab Switching ====================
var FLOW_TABS = ['preview', 'rule', 'export'];
var currentTabName = 'preview';

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(function(c) { c.style.display = 'none'; });
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    var target = document.getElementById('tab-' + tabName);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.tab[data-tab="' + tabName + '"]').forEach(function(t) { t.classList.add('active'); });
    // Update stepper
    updateFlowStepper(tabName);
    // Track current tab and sync next button
    currentTabName = tabName;
    syncNextStepBtn();
    return false;
}

function syncNextStepBtn() {
    var idx = FLOW_TABS.indexOf(currentTabName);
    var stepLabels = ['转换预览', '规则补全', '确认导出'];

    // Info text
    var infoEl = document.getElementById('stepBottomInfo');
    if (infoEl) infoEl.textContent = '步骤 ' + (idx + 1) + ' / ' + FLOW_TABS.length + '：' + stepLabels[idx];

    // Prev button
    var prevBtn = document.getElementById('prevStepBtn');
    if (prevBtn) {
        prevBtn.disabled = idx === 0;
        prevBtn.style.opacity = idx === 0 ? '0.35' : '1';
        prevBtn.style.cursor = idx === 0 ? 'not-allowed' : 'pointer';
    }

    // Next button
    var nextBtn = document.getElementById('nextStepBtn');
    if (!nextBtn) return;
    if (idx === FLOW_TABS.length - 1) {
        nextBtn.textContent = '确认导出 ✓';
        nextBtn.style.background = '#10a060';
        nextBtn.style.borderColor = '#10a060';
    } else {
        nextBtn.textContent = '下一步 →';
        nextBtn.style.background = '';
        nextBtn.style.borderColor = '';
    }
}

function goPrevStep() {
    var idx = FLOW_TABS.indexOf(currentTabName);
    if (idx > 0) switchTab(FLOW_TABS[idx - 1]);
}

function goNextStep() {
    var idx = FLOW_TABS.indexOf(currentTabName);
    if (idx < FLOW_TABS.length - 1) {
        switchTab(FLOW_TABS[idx + 1]);
    } else {
        // On last step — open export dropdown
        var dd = document.getElementById('detailExportDropdown');
        if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    }
}

function updateFlowStepper(activeTab) {
    var steps = document.querySelectorAll('.flow-step');
    var lines = [document.getElementById('flowLine1'), document.getElementById('flowLine2')];
    var order = ['preview', 'rule', 'export'];
    var activeIndex = order.indexOf(activeTab);

    steps.forEach(function(step, idx) {
        var stepName = step.getAttribute('data-step');
        var stepIdx = order.indexOf(stepName);
        step.classList.remove('active', 'done');
        if (stepIdx < activeIndex) {
            step.classList.add('done');
        } else if (stepIdx === activeIndex) {
            step.classList.add('active');
        }
    });
    if (lines[0]) {
        lines[0].classList.toggle('done', activeIndex > 0);
    }
    if (lines[1]) {
        lines[1].classList.toggle('done', activeIndex > 1);
    }
}

// ==================== Upload Modal ====================
function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

function removeFile() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileSelected').style.display = 'none';
    document.getElementById('fileDropZone').style.display = '';
}

function submitUpload() {
    var name = document.getElementById('newTaskName').value.trim();
    if (!name) { alert('请输入任务名称'); return; }
    var fileInput = document.getElementById('fileInput');
    if (!fileInput.files || !fileInput.files.length) { alert('请选择要上传的文件'); return; }
    var modal = document.querySelector('.modal');
    modal.innerHTML = '<div class="upload-loading">' +
        '<div class="loading-spinner"></div>' +
        '<h3 class="loading-title">正在解析测试用例...</h3>' +
        '<p class="loading-desc">识别结构、匹配规则中，完成后将进入预览环节</p>' +
        '<div class="loading-progress"><div class="loading-progress-bar"></div></div>' +
        '</div>';
    setTimeout(function() {
        var bar = document.querySelector('.loading-progress-bar');
        if (bar) bar.style.width = '100%';
    }, 100);
    setTimeout(function() {
        var keys = Object.keys(TASK_DATA);
        var randomKey = keys[Math.floor(Math.random() * keys.length)];
        location.href = 'detail.html?task=' + randomKey + '&tab=preview';
    }, 1800);
}

// ==================== Detail Page: Dynamic Rendering ====================
var currentTaskData = null;

function getTaskId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('task') || 'TC-2026-021';
}

function renderDetailPage() {
    var taskId = getTaskId();
    var data = (typeof TASK_DATA !== 'undefined') ? TASK_DATA[taskId] : null;
    if (!data) return;
    currentTaskData = data;

    // Header
    var titleEl = document.getElementById('taskTitle');
    if (titleEl) titleEl.textContent = data.name;
    var subtitleEl = document.getElementById('taskSubtitle');
    if (subtitleEl) subtitleEl.textContent = '任务编号 ' + data.id + ' · ' + data.statusLabel;
    var badgesEl = document.getElementById('headerBadges');
    if (badgesEl) {
        var html = '';
        data.badges.forEach(function(b) { html += '<span class="badge badge-' + b.type + '">' + b.text + '</span>'; });
        html += '<a href="index.html" class="btn btn-outline" style="margin:0; padding:6px 14px; font-size:13px;">← 返回列表</a>';
        badgesEl.innerHTML = html;
    }

    // Determine if rules need completion
    var needsRuleCompletion = data.rule && data.rule.pendingItems && data.rule.pendingItems.length > 0;

    renderPreviewTree(data.preview);
    renderFlowGuidance(needsRuleCompletion, data);
    renderRuleList(data.rule);
    renderExportTab(data.exportData);

    // Initial stepper state
    var params = new URLSearchParams(window.location.search);
    var tab = params.get('tab') || 'preview';
    updateFlowStepper(tab);
}

// ==================== Flow Guidance & Action Bars ====================
function renderFlowGuidance(needsRuleCompletion, data) {
    var previewGuidance = document.getElementById('previewGuidance');
    var ruleGuidance = document.getElementById('ruleGuidance');
    var skipBadge = document.getElementById('ruleSkipBadge');

    // Preview tab guidance
    if (previewGuidance) {
        if (needsRuleCompletion) {
            var count = data.rule.pendingItems.length;
            previewGuidance.innerHTML = '<div class="guidance-banner warning"><span class="guidance-icon">⚠️</span><div class="guidance-text"><strong>发现 ' + count + ' 条未匹配规则</strong><p>预览完成后，需进入下一步进行规则补全与映射确认。</p></div></div>';
        } else {
            previewGuidance.innerHTML = '<div class="guidance-banner success"><span class="guidance-icon">✅</span><div class="guidance-text"><strong>所有规则已完全匹配</strong><p>无需手动补全，确认预览无误后可直接导出。</p></div></div>';
        }
    }

    // Rule tab guidance
    if (ruleGuidance) {
        if (needsRuleCompletion) {
            ruleGuidance.innerHTML = '<div class="guidance-banner info"><span class="guidance-icon">📝</span><div class="guidance-text"><strong>请逐条确认或修正以下映射规则</strong><p>全部确认后即可进入导出环节。若候选规则置信度较高，可一键确认。</p></div></div>';
        } else {
            ruleGuidance.innerHTML = '<div class="guidance-banner success"><span class="guidance-icon">✅</span><div class="guidance-text"><strong>所有规则已匹配完毕，无待处理项</strong><p>您可以直接进入导出环节。</p></div></div>';
        }
    }

    // Skip badge on stepper
    if (skipBadge) {
        skipBadge.style.display = needsRuleCompletion ? 'none' : 'block';
    }
}

function confirmAllRules() {
    document.querySelectorAll('.rule-pending-item').forEach(function(item) {
        item.style.opacity = '0.5';
        if (!item.querySelector('.badge-green-sm')) {
            item.innerHTML += '<span class="badge badge-green-sm" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">✓ 已确认</span>';
        }
    });
}

// ==================== PREVIEW TAB: Interactive Tree ====================
function renderPreviewTree(preview) {
    if (!preview) return;
    var treeEl = document.getElementById('treeView');
    if (!treeEl) return;

    var html = '';
    preview.tree.forEach(function(node) {
        var indent = (node.level - 1) * 16;
        var isLeaf = !node.children || node.children.length === 0;
        var icon = isLeaf ? '📄' : (node.level === 1 ? '📁' : '📂');
        var resultBadge = '';
        if (node.result) {
            var cls = node.result === 'Passed' ? 'green' : (node.result === 'Failed' ? 'red' : 'orange');
            resultBadge = '<span class="badge badge-' + cls + '-sm" style="margin-left:6px">' + node.result + '</span>';
        }
        var clickable = isLeaf ? ' clickable-node' : '';
        html += '<div class="tree-node' + clickable + '" data-node-id="' + node.id + '" style="margin-left:' + indent + 'px" onclick="selectPreviewNode(\'' + node.id + '\')">';
        html += '<span class="tree-icon">' + icon + '</span>';
        html += '<span class="tree-text">' + node.label + resultBadge + '</span>';
        html += '</div>';
    });
    treeEl.innerHTML = html;
}

function selectPreviewNode(nodeId) {
    if (!currentTaskData || !currentTaskData.preview) return;
    var steps = currentTaskData.preview.steps[nodeId];

    // Highlight selected node
    document.querySelectorAll('.tree-node').forEach(function(n) { n.classList.remove('selected'); });
    var target = document.querySelector('.tree-node[data-node-id="' + nodeId + '"]');
    if (target) target.classList.add('selected');

    var emptyEl = document.getElementById('previewEmpty');
    var contentEl = document.getElementById('previewContent');

    if (!steps) {
        // Non-leaf node, show message
        if (emptyEl) emptyEl.style.display = '';
        if (contentEl) contentEl.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    var html = '';
    // Title header
    html += '<div class="preview-detail-header">';
    html += '<h3>' + steps.title + '</h3>';
    html += '<p class="preview-chinese-name">' + steps.chineseName + '</p>';
    html += '</div>';

    // Comparison table
    html += '<div class="comparison-table">';
    html += '<div class="comp-header"><div class="comp-col-type">类型</div><div class="comp-col-zh">中文描述（输入）</div><div class="comp-col-code">测试代码（输出）</div><div class="comp-col-exp">期望结果</div></div>';

    // Precondition
    html += '<div class="comp-row precondition">';
    html += '<div class="comp-col-type"><span class="step-type-badge pre">Precondition</span></div>';
    html += '<div class="comp-col-zh">' + steps.precondition.zh + '</div>';
    html += '<div class="comp-col-code"><code>' + steps.precondition.code + '</code></div>';
    html += '<div class="comp-col-exp"><code>' + (steps.precondition.expected || '-') + '</code></div>';
    html += '</div>';

    // Test Steps
    steps.testSteps.forEach(function(s, idx) {
        var note = s.note ? '<span class="step-note">' + s.note + '</span>' : '';
        html += '<div class="comp-row">';
        html += '<div class="comp-col-type"><span class="step-type-badge step">Step ' + (idx + 1) + '</span></div>';
        html += '<div class="comp-col-zh">' + (s.zh || '<em style="color:#ccc">-</em>') + note + '</div>';
        html += '<div class="comp-col-code"><code>' + s.code.replace(/\n/g, '<br>') + '</code></div>';
        html += '<div class="comp-col-exp"><code>' + (s.expected || '-') + '</code></div>';
        html += '</div>';
    });

    // Postcondition
    html += '<div class="comp-row postcondition">';
    html += '<div class="comp-col-type"><span class="step-type-badge post">Postcondition</span></div>';
    html += '<div class="comp-col-zh">' + steps.postcondition.zh + '</div>';
    html += '<div class="comp-col-code"><code>' + steps.postcondition.code + '</code></div>';
    html += '<div class="comp-col-exp"><code>' + (steps.postcondition.expected || '-') + '</code></div>';
    html += '</div>';

    html += '</div>'; // end comparison-table

    contentEl.innerHTML = html;
}

// ==================== RULE TAB: Interactive Pending Items ====================
function renderRuleList(rule) {
    if (!rule) return;
    var pendingEl = document.getElementById('rulePendingList');
    if (!pendingEl) return;

    var html = '';
    if (rule.pendingItems.length === 0) {
        html = '<div class="rule-all-done"><span style="font-size:24px">✅</span><p>所有规则已匹配完毕，无待处理项</p></div>';
    } else {
        rule.pendingItems.forEach(function(item, idx) {
            var activeClass = item.active ? ' rule-item-active' : '';
            html += '<div class="rule-pending-item' + activeClass + '" data-rule-idx="' + idx + '" onclick="selectRuleItem(' + idx + ')">';
            html += '<div class="rule-item-main">';
            html += '<span class="rule-item-icon">🔗</span>';
            html += '<div class="rule-item-info">';
            html += '<div class="rule-item-name">' + item.name + '</div>';
            html += '<div class="rule-item-type">' + item.type + '</div>';
            html += '</div>';
            html += '<span class="badge badge-gray-sm">' + item.count + '</span>';
            html += '</div></div>';
        });
    }
    pendingEl.innerHTML = html;

    // Auto-select active item
    if (rule.pendingItems.length > 0) {
        var activeIdx = 0;
        rule.pendingItems.forEach(function(item, idx) { if (item.active) activeIdx = idx; });
        setTimeout(function() { selectRuleItem(activeIdx); }, 100);
    }
}

function selectRuleItem(idx) {
    if (!currentTaskData || !currentTaskData.rule) return;
    var items = currentTaskData.rule.pendingItems;
    if (idx >= items.length) return;
    var item = items[idx];

    // Highlight
    document.querySelectorAll('.rule-pending-item').forEach(function(el) { el.classList.remove('rule-item-active'); });
    var target = document.querySelector('.rule-pending-item[data-rule-idx="' + idx + '"]');
    if (target) target.classList.add('rule-item-active');

    var emptyEl = document.getElementById('ruleEmpty');
    var contentEl = document.getElementById('ruleDetailContent');
    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    var d = item.detail;
    var html = '';

    // Mapping header
    html += '<div class="rule-detail-header">';
    html += '<h3>映射解析</h3>';
    html += '<span class="badge badge-blue">' + d.ruleType + '</span>';
    html += '</div>';

    // Input → Output mapping card
    html += '<div class="mapping-card">';
    html += '<div class="mapping-from"><div class="mapping-label">中文输入</div><div class="mapping-value zh-value">"' + d.zhInput + '"</div></div>';
    html += '<div class="mapping-arrow">→</div>';
    html += '<div class="mapping-to"><div class="mapping-label">代码输出</div><div class="mapping-value code-value"><code>' + d.codeOutput + '</code></div></div>';
    html += '</div>';

    // Explanation
    html += '<div class="rule-explanation">';
    html += '<h4>转换逻辑</h4>';
    html += '<pre class="explanation-text">' + d.explanation + '</pre>';
    html += '</div>';

    // Candidates
    html += '<div class="rule-candidates">';
    html += '<h4>候选规则 <small style="color:#999; font-weight:normal">按置信度排序</small></h4>';
    d.candidates.forEach(function(c, ci) {
        var barColor = c.confidence >= 90 ? '#52c41a' : (c.confidence >= 70 ? '#fa8c16' : '#ff4d4f');
        var selected = ci === 0 ? ' candidate-selected' : '';
        html += '<div class="candidate-item' + selected + '">';
        html += '<code>' + c.code + '</code>';
        html += '<div class="confidence-bar"><div class="confidence-fill" style="width:' + c.confidence + '%; background:' + barColor + '"></div></div>';
        html += '<span class="confidence-text">' + c.confidence + '%</span>';
        html += '</div>';
    });
    html += '</div>';

    // Affected steps
    html += '<div class="rule-affected">';
    html += '<h4>影响范围 <span class="badge badge-orange-sm">' + d.affectedSteps.length + ' 处</span></h4>';
    html += '<div class="affected-list">';
    d.affectedSteps.forEach(function(a) {
        html += '<div class="affected-item"><span class="affected-case">' + a.case + '</span><span class="affected-step">' + a.step + '</span></div>';
    });
    html += '</div></div>';

    // Action buttons
    html += '<div class="rule-actions">';
    html += '<button class="btn btn-primary" onclick="confirmRule(' + idx + ')">确认此规则</button>';
    html += '<button class="btn btn-outline" onclick="alert(\'已跳过该规则\')">跳过</button>';
    html += '</div>';

    contentEl.innerHTML = html;
}

function confirmRule(idx) {
    var item = document.querySelector('.rule-pending-item[data-rule-idx="' + idx + '"]');
    if (item) {
        item.style.opacity = '0.5';
        item.innerHTML += '<span class="badge badge-green-sm" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">✓ 已确认</span>';
    }
    alert('规则已确认！该映射将应用到所有相关节点。');
}

// ==================== EXPORT TAB ====================
function renderExportTab(exportData) {
    if (!exportData) return;
    var modulesEl = document.getElementById('exportModules');
    if (modulesEl) {
        var html = '';
        exportData.modules.forEach(function(m) {
            var statusText = m.pending ? (m.pending + ' 条待补全') : '全部可导出';
            var statusClass = m.pending ? 'status-fail' : 'status-pass';
            var barColor = m.progress === 100 ? '#52c41a' : '#fa8c16';
            html += '<div class="export-card">';
            html += '<h4>' + m.icon + ' ' + m.name + '</h4>';
            html += '<p>共 ' + m.total + ' 条测试用例</p>';
            html += '<div class="export-meta"><span>' + m.exportable + ' 条可导出</span><span class="' + statusClass + '">' + statusText + '</span></div>';
            html += '<div style="margin-top:8px; height:4px; background:#f0f0f0; border-radius:2px;">';
            html += '<div style="width:' + m.progress + '%; height:100%; background:' + barColor + '; border-radius:2px;"></div></div>';
            html += '</div>';
        });
        modulesEl.innerHTML = html;
    }
    var historyEl = document.getElementById('exportHistory');
    if (historyEl) {
        var html = '';
        if (exportData.history.length === 0) {
            html = '<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">暂无导出记录</td></tr>';
        } else {
            exportData.history.forEach(function(h) {
                html += '<tr><td>' + h.time + '</td><td>' + h.file + '</td><td>Excel</td><td>' + h.count + '</td><td>' + h.user + '</td>';
                html += '<td><a href="#" class="clickable" onclick="alert(\'下载：' + h.file + '\')">下载</a></td></tr>';
            });
        }
        historyEl.innerHTML = html;
    }
}

function toggleDetailExportMenu(e) {
    e.stopPropagation();
    var dd = document.getElementById('detailExportDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function doExport(fmt) {
    var dd = document.getElementById('detailExportDropdown');
    if (dd) dd.style.display = 'none';

    fmt = fmt || 'excel';
    var fmtMap = {
        excel: { label: 'Excel', icon: '&#x1F4CA;', color: '#1e7e45', ext: '.xlsx' },
        word:  { label: 'Word',  icon: '&#x1F4C4;', color: '#2b5eb8', ext: '.docx' },
        pdf:   { label: 'PDF',   icon: '&#x1F4DC;', color: '#e03030', ext: '.pdf'  }
    };
    var info = fmtMap[fmt] || fmtMap['excel'];
    var taskId = getTaskId();
    var data = TASK_DATA[taskId];
    var docTitle = data ? data.name : '测试用例';

    var existing = document.getElementById('detailExportToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'detailExportToast';
    toast.className = 'export-toast';
    toast.innerHTML =
        '<div class="export-toast-icon">' + info.icon + '</div>' +
        '<div class="export-toast-body">' +
        '<div class="export-toast-title">导出 ' + info.label + ' 中…</div>' +
        '<div class="export-toast-sub">' + docTitle + info.ext + '</div>' +
        '<div class="export-progress"><div class="export-progress-bar" id="detailExportBar" style="width:0%;"></div></div>' +
        '</div>';
    document.body.appendChild(toast);

    var bar = document.getElementById('detailExportBar');
    var pct = 0;
    var timer = setInterval(function() {
        pct += Math.random() * 28 + 8;
        if (pct >= 100) {
            pct = 100;
            clearInterval(timer);
            if (bar) bar.style.width = '100%';
            setTimeout(function() {
                var t = document.getElementById('detailExportToast');
                if (t) {
                    t.innerHTML =
                        '<div class="export-toast-icon" style="color:' + info.color + ';">&#x2705;</div>' +
                        '<div class="export-toast-body">' +
                        '<div class="export-toast-title" style="color:' + info.color + ';">\u5bfc\u51fa\u6210\u529f</div>' +
                        '<div class="export-toast-sub">' + docTitle + info.ext + ' \u5df2\u5c31\u7eea\u4e0b\u8f7d</div>' +
                        '</div>';
                    setTimeout(function() {
                        var t2 = document.getElementById('detailExportToast');
                        if (t2) t2.remove();
                    }, 2500);
                }
            }, 400);
        } else {
            if (bar) bar.style.width = pct + '%';
        }
    }, 200);
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    var tab = params.get('tab');
    if (tab) switchTab(tab);

    // Close export dropdown on outside click
    document.addEventListener('click', function(e) {
        var dd = document.getElementById('detailExportDropdown');
        if (dd && dd.style.display !== 'none') {
            if (!e.target.closest('.export-btn-wrap')) dd.style.display = 'none';
        }
    });

    if (window.location.pathname.indexOf('detail') !== -1) {
        renderDetailPage();
    }

    // File upload handling
    var dropZone = document.getElementById('fileDropZone');
    var fileInput = document.getElementById('fileInput');
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', function() { fileInput.click(); });
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                document.getElementById('fileName').textContent = this.files[0].name;
                document.getElementById('fileSelected').style.display = 'flex';
                dropZone.style.display = 'none';
            }
        });
        dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = '#1890ff'; dropZone.style.background = '#f0f7ff'; });
        dropZone.addEventListener('dragleave', function() { dropZone.style.borderColor = '#d9d9d9'; dropZone.style.background = ''; });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault(); dropZone.style.borderColor = '#d9d9d9'; dropZone.style.background = '';
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                document.getElementById('fileName').textContent = e.dataTransfer.files[0].name;
                document.getElementById('fileSelected').style.display = 'flex';
                dropZone.style.display = 'none';
            }
        });
    }

    // Modal overlay click to close
    var modalOverlay = document.getElementById('uploadModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) closeUploadModal(); });
    }
});
