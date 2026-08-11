/* ============================================
   AI Document Assistant - App Logic
   ============================================ */

/* ---- doc-assistant.html: Document List Page ---- */
var currentDocFilter = '全部';
var currentDocSearch = '';

function initDocList() {
    renderDocList();
    bindDocListEvents();
}

function bindDocListEvents() {
    var tabs = document.querySelectorAll('.doc-category-tabs .cat-tab');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            currentDocFilter = this.textContent.trim();
            renderDocList();
        });
    });
    var searchInput = document.querySelector('.doc-list-header .doc-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentDocSearch = this.value.trim().toLowerCase();
            renderDocList();
        });
    }
}

function renderDocList() {
    var tbody = document.querySelector('.doc-table tbody');
    if (!tbody) return;
    var filtered = DOC_DOCUMENTS.filter(function(doc) {
        var project = DOC_PROJECTS.find(function(p) { return p.id === doc.projectId; });
        var matchFilter = currentDocFilter === '全部' || doc.type.indexOf(currentDocFilter.replace('方案', '')) >= 0 || doc.type === currentDocFilter;
        if (currentDocFilter === '总体方案') matchFilter = doc.type === '总体方案';
        if (currentDocFilter === '设计任务书') matchFilter = doc.type === '设计任务书';
        if (currentDocFilter === '验证方案') matchFilter = doc.type === '验证方案';
        var matchSearch = !currentDocSearch || doc.title.toLowerCase().indexOf(currentDocSearch) >= 0 || (project && (project.code.toLowerCase().indexOf(currentDocSearch) >= 0 || project.model.toLowerCase().indexOf(currentDocSearch) >= 0));
        return matchFilter && matchSearch;
    });
    var html = '';
    filtered.forEach(function(doc) {
        var project = DOC_PROJECTS.find(function(p) { return p.id === doc.projectId; });
        var st = DOC_STATUS_MAP[doc.status];
        html += '<tr onclick="openDocEditor(\'' + doc.id + '\')">';
        html += '<td><div class="doc-name">' + doc.title + '</div><div class="doc-meta">' + doc.meta + '</div></td>';
        html += '<td><span class="doc-project">' + (project ? project.code + ' / ' + project.model : '') + '</span></td>';
        html += '<td><span class="status-tag ' + st.cls + '">' + st.label + '</span></td>';
        html += '<td>' + doc.time + '</td>';
        html += '</tr>';
    });
    if (!html) html = '<tr><td colspan="4" style="text-align:center;color:#999;padding:40px;">暂无匹配文档</td></tr>';
    tbody.innerHTML = html;
    // update stats
    var statNumbers = document.querySelectorAll('.doc-stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = DOC_DOCUMENTS.length;
        statNumbers[1].textContent = DOC_DOCUMENTS.filter(function(d) { return d.status === 'pending' || d.status === 'draft'; }).length;
        statNumbers[2].textContent = DOC_DOCUMENTS.filter(function(d) { return d.status === 'editing'; }).length;
        statNumbers[3].textContent = DOC_DOCUMENTS.filter(function(d) { return d.status === 'archived'; }).length;
    }
}

function openDocEditor(docId) {
    location.href = 'doc-editor.html?doc=' + docId;
}

/* ---- doc-new.html: New Document Wizard ---- */
var selectedProject = null;
var selectedTemplate = null;
var currentStep = 1;

function initDocNew() {
    selectedProject = DOC_PROJECTS[0];
    selectedTemplate = DOC_TEMPLATES[0];
    renderProjectList();
    renderTemplateList();
    renderBasis();
    renderConfirmSide();
    bindNewDocEvents();
}

function bindNewDocEvents() {
    // project category tabs
    var pTabs = document.querySelectorAll('.wizard-section:first-child .cat-tab');
    if (pTabs.length) {
        pTabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                pTabs.forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                renderProjectList(this.textContent.trim());
            });
        });
    }
    // template category tabs
    var tTabs = document.querySelectorAll('.wizard-section:last-child .cat-tab');
    if (tTabs.length) {
        tTabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                tTabs.forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                renderTemplateList(this.textContent.trim());
            });
        });
    }
}

function renderProjectList(filter) {
    var container = document.querySelector('.project-list');
    if (!container) return;
    var projects = DOC_PROJECTS;
    if (filter && filter !== '全部') {
        projects = projects.filter(function(p) { return p.category === filter || p.phase.indexOf(filter) >= 0; });
    }
    var html = '';
    projects.forEach(function(p) {
        var sel = selectedProject && selectedProject.id === p.id ? ' selected' : '';
        html += '<div class="project-item' + sel + '" onclick="selectProject(\'' + p.id + '\')">';
        html += '<div class="project-item-name">' + p.name + '</div>';
        html += '<div class="project-item-meta">' + p.code + ' · ' + p.model + ' · ' + p.phase + '</div>';
        html += '</div>';
    });
    container.innerHTML = html;
}

function selectProject(id) {
    selectedProject = DOC_PROJECTS.find(function(p) { return p.id === id; });
    renderProjectList();
    renderBasis();
    renderConfirmSide();
}

function renderTemplateList(filter) {
    var container = document.querySelector('.template-select-list');
    if (!container) return;
    var templates = DOC_TEMPLATES;
    if (filter && filter !== '全部') {
        templates = templates.filter(function(t) { return t.category === filter; });
    }
    var tagCls = { '设计类': 'design', '分析类': 'analysis', '验证类': 'verify', '评审类': 'review' };
    var html = '';
    templates.forEach(function(t) {
        var sel = selectedTemplate && selectedTemplate.id === t.id ? ' selected' : '';
        html += '<div class="tpl-select-item' + sel + '" onclick="selectTemplate(\'' + t.id + '\')">';
        html += '<div><div class="tpl-select-name">' + t.name + '</div><div class="tpl-select-meta">' + t.phase + ' · ' + t.chapters + ' 章</div></div>';
        html += '<span class="tpl-tag ' + (tagCls[t.category] || '') + '">' + t.category + '</span>';
        html += '</div>';
    });
    container.innerHTML = html;
}

function selectTemplate(id) {
    selectedTemplate = DOC_TEMPLATES.find(function(t) { return t.id === id; });
    renderTemplateList();
    renderBasis();
    renderConfirmSide();
}

function renderBasis() {
    var container = document.querySelector('.basis-grid');
    if (!container || !selectedProject || !selectedTemplate) return;
    container.innerHTML =
        '<div class="basis-card"><div class="basis-title">项目信息</div><div class="basis-content">' + selectedProject.model + ' · ' + selectedProject.phase + ' · 徐工重型技术中心</div></div>' +
        '<div class="basis-card"><div class="basis-title">前序文档</div><div class="basis-content">项目立项书、市场输入清单、结构计算报告</div></div>' +
        '<div class="basis-card"><div class="basis-title">历史案例</div><div class="basis-content">相似案例 12 个，最高相似：70t 臂架优化</div></div>' +
        '<div class="basis-card"><div class="basis-title">模板章节</div><div class="basis-content">' + selectedTemplate.chapters + ' 章：' + selectedTemplate.desc.substring(0, 40) + '</div></div>';
}

function renderConfirmSide() {
    var card = document.querySelector('.confirm-card.highlight');
    if (!card || !selectedProject || !selectedTemplate) return;
    card.querySelector('.confirm-title').textContent = selectedProject.name + ' - ' + selectedTemplate.name;
    card.querySelector('.confirm-meta').textContent = selectedProject.code + ' · ' + selectedTemplate.chapters + ' 个章节';
}

function goStep(n) {
    currentStep = n;
    document.querySelectorAll('.step').forEach(function(s, i) {
        s.classList.toggle('active', i < n);
    });
}

function startGenerate() {
    var btn = document.querySelector('.doc-new-side .btn-primary');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '生成中...';
    setTimeout(function() {
        location.href = 'doc-editor.html?doc=D001&new=1';
    }, 1500);
}

/* ---- doc-editor.html: Online Editor ---- */
var currentDocId = 'D001';
var currentChapterId = 'ch3_1';
var currentAiTab = 'annotate';

function initDocEditor() {
    // parse URL
    var params = new URLSearchParams(window.location.search);
    currentDocId = params.get('doc') || 'D001';
    var editorData = DOC_EDITOR_DATA[currentDocId];
    if (!editorData) editorData = DOC_EDITOR_DATA['D001'];
    // Set title
    var titleEl = document.querySelector('.editor-doc-title');
    if (titleEl) titleEl.textContent = editorData.title;
    var outlineTitleEl = document.querySelector('.outline-title');
    if (outlineTitleEl) outlineTitleEl.textContent = editorData.title;
    // Render outline
    renderEditorOutline(editorData);
    // Select first chapter with content
    var firstChapter = findFirstLeaf(editorData.outline);
    if (firstChapter) {
        currentChapterId = firstChapter;
    }
    selectChapter(currentChapterId);
}

function findFirstLeaf(outline) {
    for (var i = 0; i < outline.length; i++) {
        if (outline[i].children && outline[i].children.length > 0) {
            return outline[i].children[0].id;
        }
        if (DOC_EDITOR_DATA[currentDocId] && DOC_EDITOR_DATA[currentDocId].chapters[outline[i].id]) {
            return outline[i].id;
        }
    }
    return 'ch3_1';
}

function renderEditorOutline(data) {
    var container = document.querySelector('.outline-tree');
    if (!container) return;
    var statusLabels = { done: '已完成', pending: '待补充', current: '当前' };
    var html = '';
    data.outline.forEach(function(item) {
        var active = item.id === currentChapterId ? ' active' : '';
        html += '<div class="outline-item' + active + '" onclick="selectChapter(\'' + item.id + '\')">';
        html += '<span>' + item.title + '</span>';
        html += '<span class="outline-status ' + item.status + '">' + (statusLabels[item.status] || '') + '</span>';
        html += '</div>';
        if (item.children) {
            item.children.forEach(function(child) {
                var childActive = child.id === currentChapterId ? ' active' : '';
                html += '<div class="outline-item sub' + childActive + '" onclick="selectChapter(\'' + child.id + '\')">';
                html += '<span>' + child.title + '</span>';
                html += '<span class="outline-status ' + child.status + '">' + (statusLabels[child.status] || '') + '</span>';
                html += '</div>';
            });
        }
    });
    container.innerHTML = html;
}

function selectChapter(chapterId) {
    currentChapterId = chapterId;
    var editorData = DOC_EDITOR_DATA[currentDocId] || DOC_EDITOR_DATA['D001'];
    // Update outline active state
    renderEditorOutline(editorData);
    // Render content
    renderChapterContent(editorData, chapterId);
    // Render AI panel
    renderAiPanel(editorData, chapterId);
}

function renderChapterContent(data, chapterId) {
    var container = document.querySelector('.editor-content');
    if (!container) return;
    var chapter = data.chapters[chapterId];
    if (!chapter) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">该章节内容待生成</div>';
        return;
    }
    var html = '<div class="doc-section-heading">' + chapter.heading + '</div>';
    var hasHighlighted = false;
    chapter.paragraphs.forEach(function(p) {
        var cls = p.highlighted ? ' highlighted' : '';
        if (p.highlighted) hasHighlighted = true;
        var text = p.text.replace(/\n/g, '<br>');
        html += '<div class="doc-paragraph' + cls + '"><p>' + text + '</p></div>';
    });
    if (hasHighlighted) {
        html += '<div class="doc-selection-hint">已选中文本 · 可处理</div>';
    }
    if (chapter.table) {
        html += '<div class="doc-subheading">关键功能模块对照表</div>';
        html += '<table class="doc-content-table"><thead><tr>';
        chapter.table.headers.forEach(function(h) { html += '<th>' + h + '</th>'; });
        html += '</tr></thead><tbody>';
        chapter.table.rows.forEach(function(row) {
            html += '<tr>';
            row.forEach(function(cell) { html += '<td>' + cell + '</td>'; });
            html += '</tr>';
        });
        html += '</tbody></table>';
    }
    html += '<div class="editor-footer-hint">点击左侧目录切换章节，右侧可进行 AI 协作</div>';
    container.innerHTML = html;
}

function renderAiPanel(data, chapterId) {
    var chapter = data.chapters[chapterId];
    // Render annotations tab
    var annoContainer = document.getElementById('tab-annotate');
    if (annoContainer && chapter) {
        var html = '<div class="ai-section-title">当前段落批注</div>';
        if (chapter.annotations.length === 0) {
            html += '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">本章节暂无批注</div>';
        } else {
            chapter.annotations.forEach(function(a) {
                html += '<div class="annotation-card ' + a.type + '">';
                html += '<div class="anno-header"><span class="anno-id">' + a.id + '</span><span class="anno-label">' + a.label + '</span></div>';
                html += '<p class="anno-text">' + a.text + '</p>';
                html += '<div class="anno-action">' + a.action + '</div>';
                html += '</div>';
            });
        }
        html += '<div class="review-card"><div class="review-header">评审意见</div><p class="review-text">建议补充采样频率、阈值设置来源和复核人字段。</p><div class="review-meta">王工 · 10:42</div></div>';
        annoContainer.innerHTML = html;
    }
    // Render chat tab
    var chatContainer = document.getElementById('tab-chat');
    if (chatContainer) {
        var chatHistory = DOC_CHAT_HISTORY[chapterId] || [];
        var html = '<div class="ai-section-title">建议操作</div>';
        var actions = [
            { key: 'rewrite',  color: '#b0b8c8', bg: '#f0f2f5', title: '润色本段',   desc: '优化表达和携辞' },
            { key: 'expand',   color: '#a0c4ff', bg: '#e8f2ff', title: '扩写本节',   desc: '补充结构与细节' },
            { key: 'comment',  color: '#f5c518', bg: '#fff8e0', title: '根据评论修改', desc: '结合审评意见处理' },
            { key: 'review',   color: '#e03030', bg: '#fff0f0', title: '一键审核',   desc: '检查引用、格式与事实'},
            { key: 'history',  color: '#c8a0e8', bg: '#f5efff', title: '查看历史案例参考', desc: '检索相似文档' }
        ];
        actions.forEach(function(a) {
            html += '<div class="suggest-action' + (a.active ? ' active' : '') + '" onclick="' + (a.key === 'review' ? 'startReview()' : 'aiAction(\'' + a.key + '\')') + '">'
                + '<div class="suggest-action-icon" style="background:' + a.bg + '; display:flex; align-items:center; justify-content:center;">'
                + '<span style="width:10px; height:10px; border-radius:50%; background:' + a.color + '; display:inline-block;"></span></div>'
                + '<div class="suggest-action-body">'
                + '<div class="suggest-action-title">' + a.title + '</div>'
                + '<div class="suggest-action-desc">' + a.desc + '</div>'
                + '</div></div>';
        });
        html += '<div class="ai-section-title" style="margin-top:16px">当前上下文</div>';
        html += '<div class="chat-context-card"><div class="context-title">' + (chapter ? chapter.heading : '') + ' · 选中段落</div>';
        html += '<p class="context-desc">可针对当前章节内容与 AI 对话，进行润色、扩写、引用分析等操作。</p></div>';
        chatHistory.forEach(function(msg, idx) {
            if (msg.role === 'user') {
                html += '<div class="chat-bubble user"><p>' + msg.text + '</p></div>';
            } else {
                html += '<div class="chat-bubble ai"><p><strong>AI 助手</strong></p><p>' + msg.text + '</p>';
                if (msg.refs && msg.refs.length) {
                    html += '<div class="chat-refs">';
                    msg.refs.forEach(function(r) { html += '<span class="chat-ref-tag">' + r + '</span>'; });
                    html += '</div>';
                }
                // Action buttons for AI response
                var escapedText = msg.text.replace(/'/g, '\'').replace(/"/g, '&quot;');
                html += '<div class="ai-bubble-actions">';
                html += '<button class="ai-bubble-btn apply-btn" onclick="applyToSelection(' + idx + ')" title="将AI回复内容应用到当前选区">';
                html += '<span class="ai-bubble-btn-icon">✏️</span>应用到选区</button>';
                html += '<button class="ai-bubble-btn comment-btn" onclick="insertAnnotation(' + idx + ')" title="将AI回复内容作为批注插入">';
                html += '<span class="ai-bubble-btn-icon">💬</span>插入批注</button>';
                html += '</div>';
                html += '</div>';
            }
        });
        chatContainer.innerHTML = html;
    }
}

function switchAiTab(tab, btn) {
    currentAiTab = tab;
    document.querySelectorAll('.ai-tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.ai-tab-content').forEach(function(c) { c.style.display = 'none'; });
    document.getElementById('tab-' + tab).style.display = 'block';
}

function aiAction(type) {
    var actions = {
        rewrite:  '请帮我润色改写当前段落，使其更符合设计方案的正式表达。',
        expand:   '请帮我扩写当前段落，补充更多技术细节。',
        comment:  '请结合审评意见，帮我对当前段落进行修改完善。',
        cite:     '请检查当前段落的引用和事实依据是否准确充分。',
        history:  '请检索相似历史案例，为当前章节提供参考。'
    };
    sendChatMessage(actions[type] || '');
}

function applyToSelection(msgIdx) {
    var history = DOC_CHAT_HISTORY[currentChapterId] || [];
    // find the msgIdx-th message in the full history
    var msg = history[msgIdx];
    if (!msg || msg.role !== 'ai') return;
    var text = msg.text;

    // Find the active chapter editor block and append AI content
    var editorContent = document.querySelector('.editor-content');
    if (!editorContent) return;
    var activeBlock = editorContent.querySelector('.chapter-block.active .chapter-body') ||
                      editorContent.querySelector('.chapter-block .chapter-body');
    if (!activeBlock) return;

    // Insert a styled paragraph tagged as AI-applied
    var p = document.createElement('p');
    p.className = 'ai-applied-text';
    p.setAttribute('data-source', 'ai');
    p.textContent = text;
    activeBlock.appendChild(p);

    // Flash highlight to signal insertion
    p.style.transition = 'background .4s';
    p.style.background = '#d6f0e0';
    setTimeout(function() { p.style.background = ''; }, 1800);

    // Toast
    showMiniToast('✅ 内容已应用到选区');
}

function insertAnnotation(msgIdx) {
    var history = DOC_CHAT_HISTORY[currentChapterId] || [];
    var msg = history[msgIdx];
    if (!msg || msg.role !== 'ai') return;
    var text = msg.text;

    // Get current chapter data and add annotation
    var editorData = DOC_EDITOR_DATA[currentDocId] || DOC_EDITOR_DATA['D001'];
    var chapter = editorData.chapters[currentChapterId];
    if (!chapter) return;

    var now = new Date();
    var timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    var newAnno = {
        id: 'AI-' + String(chapter.annotations.length + 1).padStart(2, '0'),
        type: 'ai-note',
        label: 'AI 廻证',
        text: text,
        action: '来源：AI 助手 · ' + timeStr
    };
    chapter.annotations.push(newAnno);

    // Switch to annotate tab and re-render
    var annotateBtn = document.querySelector('.ai-tab');
    if (annotateBtn) switchAiTab('annotate', annotateBtn);
    renderAiPanel(editorData, currentChapterId);

    // Update the tab badge count
    var tabBtns = document.querySelectorAll('.ai-tab');
    if (tabBtns[0]) tabBtns[0].textContent = '批注 ' + chapter.annotations.length;

    showMiniToast('💬 批注已插入当前章节');
}

function showMiniToast(msg) {
    var t = document.createElement('div');
    t.className = 'mini-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.style.opacity = '0'; }, 1600);
    setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 2100);
}

function sendChatMessage(text) {
    if (!text) {
        var input = document.querySelector('.chat-input-field');
        if (input) { text = input.value.trim(); input.value = ''; }
    }
    if (!text) return;
    // switch to chat tab
    var chatBtn = document.querySelectorAll('.ai-tab')[1];
    if (chatBtn) switchAiTab('chat', chatBtn);
    // Add to chat history
    if (!DOC_CHAT_HISTORY[currentChapterId]) DOC_CHAT_HISTORY[currentChapterId] = [];
    DOC_CHAT_HISTORY[currentChapterId].push({ role: 'user', text: text });
    var editorData = DOC_EDITOR_DATA[currentDocId] || DOC_EDITOR_DATA['D001'];
    renderAiPanel(editorData, currentChapterId);
    // Simulate AI response
    setTimeout(function() {
        var responses = [
            '已分析当前段落内容。建议在关键数据点增加引用标注，并将表述调整为更规范的技术文档语言。需要我直接生成改写稿吗？',
            '基于模板规则和历史案例分析，当前段落结构完整。建议补充量化指标（如具体阈值范围），以增强方案的可执行性。',
            '已匹配到 3 个相似历史案例。最相似案例为"70t 臂架优化项目"第 3.2 节，相似度 87%。建议参考其验收标准表述方式。'
        ];
        var resp = responses[Math.floor(Math.random() * responses.length)];
        DOC_CHAT_HISTORY[currentChapterId].push({ role: 'ai', text: resp, refs: [] });
        renderAiPanel(editorData, currentChapterId);
    }, 1200);
}

/* ---- doc-config.html: Config Page ---- */
var selectedConfigTemplate = null;
var configFilter = '全部';
var configSearch = '';

function initDocConfig() {
    selectedConfigTemplate = DOC_CONFIG_TEMPLATES[0];
    renderConfigTemplateList();
    renderConfigDetail();
    bindConfigEvents();
}

function bindConfigEvents() {
    // category tabs
    var tabs = document.querySelectorAll('.config-left .cat-tab');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            configFilter = this.textContent.trim();
            renderConfigTemplateList();
        });
    });
    // search
    var searchInput = document.querySelector('.config-left .doc-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            configSearch = this.value.trim().toLowerCase();
            renderConfigTemplateList();
        });
    }
    // add template button
    var addBtn = document.getElementById('addTemplateBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() { openAddTemplateModal(); });
    }
    // import button
    var importBtn = document.getElementById('importTemplateBtn');
    if (importBtn) {
        importBtn.addEventListener('click', function() { openImportTemplateModal(); });
    }
    // import upload area click + drag
    var uploadArea = document.getElementById('importTplUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            document.getElementById('importTplFileInput').click();
        });
        uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', function() { uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault(); uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                document.getElementById('importTplFileInput').files = e.dataTransfer.files;
                handleImportTplFile(document.getElementById('importTplFileInput'));
            }
        });
    }
}

function renderConfigTemplateList() {
    var container = document.querySelector('.config-template-list');
    if (!container) return;
    var filtered = DOC_CONFIG_TEMPLATES.filter(function(t) {
        var matchCat = configFilter === '全部' || t.category === configFilter;
        var matchSearch = !configSearch || t.name.toLowerCase().indexOf(configSearch) >= 0 || t.phase.toLowerCase().indexOf(configSearch) >= 0;
        return matchCat && matchSearch;
    });
    var tagCls = { '设计类': 'design', '分析类': 'analysis', '验证类': 'verify', '评审类': 'review' };
    var html = '';
    filtered.forEach(function(t) {
        var sel = selectedConfigTemplate && selectedConfigTemplate.id === t.id ? ' selected' : '';
        html += '<div class="config-tpl-item' + sel + '" onclick="selectConfigTpl(\'' + t.id + '\')">';
        html += '<div class="config-tpl-left"><div class="config-tpl-name">' + t.name + '</div>';
        html += '<div class="config-tpl-meta">' + (t.enabled ? '启用' : '禁用') + ' · ' + t.phase + ' · ' + t.chapters + ' 章</div></div>';
        html += '<span class="tpl-tag ' + (tagCls[t.category] || '') + '">' + t.category + '</span>';
        html += '</div>';
    });
    if (!html) html = '<div style="padding:20px;text-align:center;color:#999;">无匹配模板</div>';
    container.innerHTML = html;
    // update stats badge
    var badges = document.querySelectorAll('.header-right .badge');
    if (badges.length >= 1) badges[0].textContent = '模板 ' + DOC_CONFIG_TEMPLATES.length;
}

function selectConfigTpl(id) {
    selectedConfigTemplate = DOC_CONFIG_TEMPLATES.find(function(t) { return t.id === id; });
    renderConfigTemplateList();
    renderConfigDetail();
}

function renderConfigDetail() {
    var container = document.querySelector('.config-right .card');
    if (!container || !selectedConfigTemplate) return;
    var t = selectedConfigTemplate;
    var html = '<div class="config-detail-header">';
    html += '<h3>规则详情：' + t.name + '</h3>';
    html += '<span class="config-enabled-badge">' + (t.enabled ? '已启用' : '已禁用') + '</span></div>';
    html += '<div class="config-field"><label>适用项目阶段</label><div class="config-value">' + t.fields.phase + '</div></div>';
    html += '<div class="config-field"><label>默认章节结构</label><div class="config-value">' + t.fields.structure + '</div></div>';
    html += '<div class="config-field"><label>AI 支撑资料</label><div class="config-value">' + t.fields.aiSupport + '</div></div>';
    html += '<div class="config-field"><label>段落生成规则</label><div class="config-value highlight">' + t.fields.genRule + '</div></div>';
    html += '<div class="config-field"><label>导出格式</label><div class="config-value">' + t.fields.exportFormat + '</div></div>';
    html += '<div class="config-callout"><div class="callout-title">业务页面调用方式</div><p>新建文档页只展示可用模板清单，用户选中项目和模板后再进入资料确认与生成。</p></div>';
    html += '<div style="display:flex; gap:8px; margin-top:20px;">';
    html += '<button class="btn btn-outline" onclick="toggleTemplate()">'
        + (t.enabled ? '禁用模板' : '启用模板') + '</button>';
    html += '<button class="btn btn-outline" onclick="editConfigTemplate()">编辑</button>';
    html += '<button class="btn btn-primary" onclick="saveConfigAlert()">保存配置</button></div>';
    container.innerHTML = html;
}

function toggleTemplate() {
    if (!selectedConfigTemplate) return;
    selectedConfigTemplate.enabled = !selectedConfigTemplate.enabled;
    renderConfigTemplateList();
    renderConfigDetail();
}

function saveConfigAlert() {
    alert('✅ 配置已保存');
}

function editConfigTemplate() {
    if (!selectedConfigTemplate) return;
    openAddTemplateModal(selectedConfigTemplate);
}

/* Add/Edit Template Modal */
function openAddTemplateModal(tpl) {
    var modal = document.getElementById('addTemplateModal');
    if (!modal) return;
    modal.style.display = 'flex';
    var isEdit = !!tpl;
    document.getElementById('tplModalTitle').textContent = isEdit ? '编辑模板：' + tpl.name : '新增模板';
    document.getElementById('tplName').value = isEdit ? tpl.name : '';
    document.getElementById('tplPhase').value = isEdit ? tpl.fields.phase : '';
    document.getElementById('tplChapters').value = isEdit ? tpl.chapters : '';
    document.getElementById('tplCategory').value = isEdit ? tpl.category : '设计类';
    document.getElementById('tplStructure').value = isEdit ? tpl.fields.structure : '';
    document.getElementById('tplAiSupport').value = isEdit ? tpl.fields.aiSupport : '';
    document.getElementById('tplGenRule').value = isEdit ? tpl.fields.genRule : '';
    document.getElementById('tplExportFormat').value = isEdit ? tpl.fields.exportFormat : 'Word、PDF';
    modal.dataset.editId = isEdit ? tpl.id : '';
}

function closeAddTemplateModal() {
    var modal = document.getElementById('addTemplateModal');
    if (modal) modal.style.display = 'none';
}

function submitAddTemplate() {
    var modal = document.getElementById('addTemplateModal');
    var editId = modal.dataset.editId;
    var name = document.getElementById('tplName').value.trim();
    var phase = document.getElementById('tplPhase').value.trim();
    var chapters = parseInt(document.getElementById('tplChapters').value) || 5;
    var category = document.getElementById('tplCategory').value;
    var structure = document.getElementById('tplStructure').value.trim();
    var aiSupport = document.getElementById('tplAiSupport').value.trim();
    var genRule = document.getElementById('tplGenRule').value.trim();
    var exportFormat = document.getElementById('tplExportFormat').value.trim();
    if (!name) { alert('请输入模板名称'); return; }
    if (editId) {
        // Edit existing
        var tpl = DOC_CONFIG_TEMPLATES.find(function(t) { return t.id === editId; });
        if (tpl) {
            tpl.name = name; tpl.phase = phase; tpl.chapters = chapters; tpl.category = category;
            tpl.fields = { phase: phase, structure: structure, aiSupport: aiSupport, genRule: genRule, exportFormat: exportFormat };
            selectedConfigTemplate = tpl;
        }
    } else {
        // Add new
        var newTpl = {
            id: 'CT' + String(DOC_CONFIG_TEMPLATES.length + 1).padStart(3, '0'),
            name: name, phase: phase, chapters: chapters, category: category, enabled: true,
            fields: { phase: phase, structure: structure, aiSupport: aiSupport, genRule: genRule, exportFormat: exportFormat }
        };
        DOC_CONFIG_TEMPLATES.push(newTpl);
        selectedConfigTemplate = newTpl;
    }
    closeAddTemplateModal();
    renderConfigTemplateList();
    renderConfigDetail();
}

function openImportTemplateModal() {
    var modal = document.getElementById('importTemplateModal');
    if (modal) {
        modal.style.display = 'flex';
        // reset state
        var fileInfo = document.getElementById('importTplFileInfo');
        var uploadArea = document.getElementById('importTplUploadArea');
        var submitBtn = document.getElementById('importTplSubmitBtn');
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'flex';
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '开始导入'; }
    }
}

function closeImportTplModal() {
    var modal = document.getElementById('importTemplateModal');
    if (modal) modal.style.display = 'none';
}

function downloadTpl(type) {
    alert('✅ 已下载模板配置' + (type === 'xlsx' ? '表.xlsx' : '样例.json') + '\n\n请按格式填写后上传。');
}

function handleImportTplFile(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        document.getElementById('importTplFileName').textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        document.getElementById('importTplFileInfo').style.display = 'flex';
        document.getElementById('importTplUploadArea').style.display = 'none';
        document.getElementById('importTplSubmitBtn').disabled = false;
    }
}

function removeImportTplFile() {
    document.getElementById('importTplFileInfo').style.display = 'none';
    document.getElementById('importTplUploadArea').style.display = 'flex';
    document.getElementById('importTplSubmitBtn').disabled = true;
    document.getElementById('importTplFileInput').value = '';
}

function submitImportTpl() {
    var btn = document.getElementById('importTplSubmitBtn');
    btn.disabled = true;
    btn.textContent = '导入中...';
    setTimeout(function() {
        // Simulate adding templates
        var newTpl = {
            id: 'CT' + String(DOC_CONFIG_TEMPLATES.length + 1).padStart(3, '0'),
            name: '导入-电控系统设计方案', phase: '详细设计', chapters: 7, category: '设计类', enabled: true,
            fields: { phase: '详细设计阶段', structure: '系统概述、硬件架构、软件架构、接口设计、测试方案、部署说明、维护手册', aiSupport: '关联电控规范、硬件手册、历史电控方案。', genRule: '按模块逐章生成，自动引用接口定义和硬件参数。', exportFormat: 'Word、PDF' }
        };
        DOC_CONFIG_TEMPLATES.push(newTpl);
        selectedConfigTemplate = newTpl;
        closeImportTplModal();
        renderConfigTemplateList();
        renderConfigDetail();
        alert('✅ 导入成功！\n\n新增 1 个模板，已自动选中。');
    }, 1500);
}

/* ---- Auto-init based on page ---- */
(function() {
    if (document.querySelector('.doc-table')) initDocList();
    if (document.querySelector('.wizard-grid')) initDocNew();
    if (document.querySelector('.editor-body')) initDocEditor();
    if (document.querySelector('.config-layout')) initDocConfig();
    // Close export dropdown on outside click
    document.addEventListener('click', function(e) {
        var dd = document.getElementById('exportDropdown');
        if (dd && dd.style.display !== 'none') {
            if (!e.target.closest('.export-btn-wrap')) dd.style.display = 'none';
        }
    });
})();

/* ============================================
   One-Click Review & Export
   ============================================ */
function toggleExportMenu(e) {
    e.stopPropagation();
    var dd = document.getElementById('exportDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function startReview() {
    // Remove any existing toast
    var existing = document.getElementById('reviewToast');
    if (existing) existing.remove();

    var issues = [
        { text: '第 2.3 节引用来源未标注', color: '#e03030' },
        { text: '第 3.1 节存在重复表述，建议删除', color: '#f5a623' },
        { text: '第 4.2 节阈值参数需补充具体数据', color: '#f5a623' },
        { text: '整体结构完整，无格式错误', color: '#10a060' },
        { text: '关键术语表述一致，术语规范正确', color: '#10a060' }
    ];

    var toast = document.createElement('div');
    toast.id = 'reviewToast';
    toast.className = 'review-toast';
    toast.innerHTML =
        '<div class="review-toast-header">' +
        '<span style="font-size:18px;">&#x1F4CB;</span>' +
        '<span class="review-toast-title">审核结果</span>' +
        '<span class="review-toast-close" onclick="document.getElementById(\'reviewToast\').remove()">&times;</span>' +
        '</div>' +
        issues.map(function(it) {
            return '<div class="review-item">' +
                '<span class="review-dot" style="background:' + it.color + ';"></span>' +
                '<span>' + it.text + '</span></div>';
        }).join('') +
        '<div style="margin-top:12px; display:flex; gap:8px;">' +
        '<button class="btn btn-primary" style="font-size:12px; flex:1;" onclick="toggleExportMenu(event); document.getElementById(\'reviewToast\').remove()">继续导出</button>' +
        '<button class="btn btn-outline" style="font-size:12px; flex:1;" onclick="document.getElementById(\'reviewToast\').remove()">返回修改</button>' +
        '</div>';
    document.body.appendChild(toast);
}

function exportDoc(fmt) {
    // Close dropdown
    var dd = document.getElementById('exportDropdown');
    if (dd) dd.style.display = 'none';

    var fmtMap = {
        ppt:  { label: 'PowerPoint', icon: '&#x1F4CA;', color: '#ff6b35', ext: '.pptx' },
        word: { label: 'Word',       icon: '&#x1F4C4;', color: '#2b5eb8', ext: '.docx' },
        pdf:  { label: 'PDF',        icon: '&#x1F4DC;', color: '#e03030', ext: '.pdf'  }
    };
    var info = fmtMap[fmt] || fmtMap['pdf'];
    var docTitle = '起重机电控系统 PRD';

    // Remove existing export toast
    var existing = document.getElementById('exportToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'exportToast';
    toast.className = 'export-toast';
    toast.innerHTML =
        '<div class="export-toast-icon">' + info.icon + '</div>' +
        '<div class="export-toast-body">' +
        '<div class="export-toast-title">导出 ' + info.label + ' 中…</div>' +
        '<div class="export-toast-sub">' + docTitle + info.ext + '</div>' +
        '<div class="export-progress"><div class="export-progress-bar" id="exportProgressBar" style="width:0%;"></div></div>' +
        '</div>';
    document.body.appendChild(toast);

    // Animate progress
    var bar = document.getElementById('exportProgressBar');
    var pct = 0;
    var timer = setInterval(function() {
        pct += Math.random() * 28 + 8;
        if (pct >= 100) {
            pct = 100;
            clearInterval(timer);
            if (bar) bar.style.width = '100%';
            setTimeout(function() {
                var t = document.getElementById('exportToast');
                if (t) {
                    t.innerHTML =
                        '<div class="export-toast-icon" style="color:' + info.color + ';">&#x2705;</div>' +
                        '<div class="export-toast-body">' +
                        '<div class="export-toast-title" style="color:' + info.color + ';">&#x5bfc;&#x51fa;&#x6210;&#x529f;</div>' +
                        '<div class="export-toast-sub">' + docTitle + info.ext + ' 已就绪下载</div>' +
                        '</div>';
                    setTimeout(function() {
                        var t2 = document.getElementById('exportToast');
                        if (t2) t2.remove();
                    }, 2500);
                }
            }, 400);
        } else {
            if (bar) bar.style.width = pct + '%';
        }
    }, 200);
}
