// ===== 古诗词储备量测试 - 核心逻辑 V5 =====
// V5改进：6级难度体系 + 稳定掌握储备量算法 + 难度降级机制

// 测试状态管理
const testState = {
    currentQuestion: 0,
    totalQuestions: 30,
    currentDifficulty: 1,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,       // 新增：连续答错计数
    correctCount: 0,
    usedQuestionIds: [],
    maxReachedDifficulty: 1,
    answers: [],
    isWaiting: false,
    usedOptionsTexts: new Set(),
    currentOptions: [],
    currentAnswerIndex: 0
};

// DOM 元素
const elements = {
    // 页面
    homePage: document.getElementById('home-page'),
    testPage: document.getElementById('test-page'),
    resultPage: document.getElementById('result-page'),
    
    // 首页
    startBtn: document.getElementById('start-btn'),
    
    // 测试页
    currentQuestionEl: document.getElementById('current-question'),
    totalQuestionsEl: document.getElementById('total-questions'),
    difficultyBadge: document.getElementById('difficulty-badge'),
    questionText: document.getElementById('question-text'),
    optionsList: document.getElementById('options-list'),
    feedbackArea: document.getElementById('feedback-area'),
    feedbackResult: document.getElementById('feedback-result'),
    feedbackParse: document.getElementById('feedback-parse'),
    
    // 结果页
    resultRange: document.getElementById('result-range'),
    resultLevel: document.getElementById('result-level'),
    statCorrect: document.getElementById('stat-correct'),
    statRate: document.getElementById('stat-rate'),
    resultSummary: document.getElementById('result-summary'),
    restartBtn: document.getElementById('restart-btn')
};

// ===== 初始化 =====
function init() {
    elements.startBtn.addEventListener('click', startTest);
    elements.restartBtn.addEventListener('click', restartTest);
    elements.totalQuestionsEl.textContent = testState.totalQuestions;
}

// ===== 开始测试 =====
function startTest() {
    // 重置状态
    testState.currentQuestion = 0;
    testState.currentDifficulty = 1;
    testState.consecutiveCorrect = 0;
    testState.consecutiveWrong = 0;
    testState.correctCount = 0;
    testState.usedQuestionIds = [];
    testState.maxReachedDifficulty = 1;
    testState.answers = [];
    testState.isWaiting = false;
    testState.usedOptionsTexts = new Set();
    testState.currentOptions = [];
    testState.currentAnswerIndex = 0;
    
    // 切换页面
    switchPage('test');
    
    // 加载第一题
    loadQuestion();
}

// ===== 动态生成选项（核心改进） =====
function generateOptions(question) {
    const answer = question.answer;
    const distractors = question.distractors || [];
    
    // 从干扰项池中筛选未使用的选项
    const availableDistractors = distractors.filter(d => !testState.usedOptionsTexts.has(d));
    
    // 随机打乱可用干扰项
    const shuffled = [...availableDistractors];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 取前3个作为干扰项（如果不够3个，从所有干扰项中补充）
    let selectedDistractors = shuffled.slice(0, 3);
    if (selectedDistractors.length < 3) {
        // 从已用过的干扰项中补充（极端情况）
        const allShuffled = [...distractors];
        for (let i = allShuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allShuffled[i], allShuffled[j]] = [allShuffled[j], allShuffled[i]];
        }
        for (const d of allShuffled) {
            if (!selectedDistractors.includes(d)) {
                selectedDistractors.push(d);
                if (selectedDistractors.length >= 3) break;
            }
        }
    }
    
    // 构建选项列表：正确答案 + 3个干扰项
    const options = [answer, ...selectedDistractors];
    
    // 随机打乱选项顺序
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    
    // 找到正确答案的位置
    const answerIndex = options.indexOf(answer);
    
    // 将所有选项标记为已使用
    options.forEach(opt => testState.usedOptionsTexts.add(opt));
    
    return { options, answerIndex };
}

// ===== 加载题目 =====
function loadQuestion() {
    testState.currentQuestion++;
    elements.currentQuestionEl.textContent = testState.currentQuestion;
    
    // 更新难度徽章
    const diffConfig = DIFFICULTY_CONFIG[testState.currentDifficulty];
    elements.difficultyBadge.textContent = diffConfig.name;
    
    // 获取题目
    const question = getRandomQuestion(testState.currentDifficulty, testState.usedQuestionIds);
    
    if (!question) {
        // 当前难度无题，尝试下一难度
        if (testState.currentDifficulty < 6) {
            testState.currentDifficulty++;
            loadQuestion();
            return;
        }
        // 无题可出，结束测试
        endTest();
        return;
    }
    
    testState.usedQuestionIds.push(question.id);
    testState.currentQuestionData = question;
    
    // 动态生成选项
    const { options, answerIndex } = generateOptions(question);
    testState.currentOptions = options;
    testState.currentAnswerIndex = answerIndex;
    
    // 显示题目
    elements.questionText.textContent = question.question;
    
    // 显示选项
    elements.optionsList.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D'];
    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-label">${labels[index]}</span>${option}`;
        btn.addEventListener('click', () => handleAnswer(index));
        elements.optionsList.appendChild(btn);
    });
    
    // 隐藏反馈
    elements.feedbackArea.classList.remove('show');
    testState.isWaiting = false;
}

// ===== 处理答案 =====
function handleAnswer(selectedIndex) {
    if (testState.isWaiting) return;
    testState.isWaiting = true;
    
    const question = testState.currentQuestionData;
    const isCorrect = selectedIndex === testState.currentAnswerIndex;
    
    // 记录答案
    testState.answers.push({
        questionId: question.id,
        difficulty: question.difficulty,
        correct: isCorrect
    });
    
    // 更新统计
    if (isCorrect) {
        testState.correctCount++;
    }
    
    // 更新最高难度记录
    if (question.difficulty > testState.maxReachedDifficulty) {
        testState.maxReachedDifficulty = question.difficulty;
    }
    
    // 显示选项状态
    const optionBtns = elements.optionsList.querySelectorAll('.option-btn');
    optionBtns.forEach((btn, index) => {
        btn.classList.add('disabled');
        if (index === testState.currentAnswerIndex) {
            btn.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            btn.classList.add('wrong');
        }
    });
    
    // 显示反馈
    elements.feedbackResult.textContent = isCorrect ? '回答正确！' : '回答错误';
    elements.feedbackResult.className = 'feedback-result ' + (isCorrect ? 'correct' : 'wrong');
    // 显示全诗+出处
    const fullContent = question.fullContent || question.answer;
    elements.feedbackParse.innerHTML = `<div class="feedback-poem">${fullContent}</div><div class="feedback-source">${question.parse}</div>`;
    elements.feedbackArea.classList.add('show');
    
    // 自适应难度调整
    adjustDifficulty(isCorrect);
    
    // 延迟后进入下一题或结束
    setTimeout(() => {
        if (testState.currentQuestion >= testState.totalQuestions) {
            endTest();
        } else {
            loadQuestion();
        }
    }, 2500);
}

// ===== 自适应难度调整（V5：增加降级机制） =====
function adjustDifficulty(isCorrect) {
    if (isCorrect) {
        testState.consecutiveCorrect++;
        testState.consecutiveWrong = 0;
        // 连续答对3道，升级难度
        if (testState.consecutiveCorrect >= 3) {
            if (testState.currentDifficulty < 6) {
                testState.currentDifficulty++;
                testState.consecutiveCorrect = 0;
            }
        }
    } else {
        testState.consecutiveWrong++;
        testState.consecutiveCorrect = 0;
        // 连续答错2道且当前难度>1，降级
        if (testState.consecutiveWrong >= 2 && testState.currentDifficulty > 1) {
            testState.currentDifficulty--;
            testState.consecutiveWrong = 0;
        }
    }
}

// ===== 结束测试 =====
function endTest() {
    // 计算结果
    const result = calculateResult();
    
    // 显示结果
    elements.resultRange.textContent = result.range;
    elements.resultLevel.textContent = result.level;
    elements.statCorrect.textContent = testState.correctCount;
    elements.statRate.textContent = Math.round((testState.correctCount / testState.totalQuestions) * 100) + '%';
    elements.resultSummary.textContent = result.summary;
    
    // 切换页面
    switchPage('result');
}

// ===== 计算测试结果（V5：稳定掌握机制） =====
function calculateResult() {
    const answers = testState.answers;
    const totalQuestions = testState.totalQuestions;
    
    // 计算每个难度的正确数和总数
    const statsByDiff = {};
    for (let d = 1; d <= 6; d++) {
        const atLevel = answers.filter(a => a.difficulty === d);
        statsByDiff[d] = {
            total: atLevel.length,
            correct: atLevel.filter(a => a.correct).length
        };
    }
    
    // 计算"稳定掌握"的难度级别
    // 定义：某难度答对率>=60%且至少答对2题，视为"稳定掌握该级别"
    let masteredLevel = 0;
    for (let d = 1; d <= 6; d++) {
        const stat = statsByDiff[d];
        if (stat.total >= 2 && stat.correct / stat.total >= 0.6) {
            masteredLevel = d;
        } else {
            break; // 一旦某级别未稳定掌握，停止
        }
    }
    
    // 如果用户没有稳定掌握任何级别，看最高答对的一道题
    if (masteredLevel === 0) {
        const correctAnswers = answers.filter(a => a.correct);
        if (correctAnswers.length > 0) {
            const maxCorrectDiff = Math.max(...correctAnswers.map(a => a.difficulty));
            masteredLevel = Math.max(1, maxCorrectDiff - 1); // 降一级作为保守估计
        } else {
            masteredLevel = 1;
        }
    }
    
    // 基础储备量 = 稳定掌握级别的下限
    const baseConfig = DIFFICULTY_CONFIG[masteredLevel];
    const baseReserve = baseConfig.min;
    
    // 额外储备量 = 在更高级别中答对的题目 × 每题价值
    // 更高级别的零散答对，每题只贡献少量储备量
    let bonusReserve = 0;
    for (let d = masteredLevel + 1; d <= 6; d++) {
        const correctAtLevel = statsByDiff[d].correct;
        const valuePerQuestion = 30; // 零散答对每题约30首的价值
        bonusReserve += correctAtLevel * valuePerQuestion;
    }
    
    // 当前级别内的表现微调
    const currentLevelStat = statsByDiff[masteredLevel];
    const currentLevelRate = currentLevelStat.total > 0 
        ? currentLevelStat.correct / currentLevelStat.total 
        : 0;
    
    // 在当前级别内，根据正确率微调（±区间宽度的80%）
    const levelInterval = baseConfig.max - baseConfig.min;
    const fineTune = Math.round(currentLevelRate * levelInterval * 0.8);
    
    // 总储备量
    let totalReserve = baseReserve + fineTune + bonusReserve;
    
    // 封顶
    const maxPossible = DIFFICULTY_CONFIG[6].max;
    totalReserve = Math.min(totalReserve, maxPossible);
    
    // 生成区间显示（50首为一个区间）
    const rangeSize = 50;
    const rangeStart = Math.floor(totalReserve / rangeSize) * rangeSize;
    const rangeEnd = rangeStart + rangeSize;
    const range = `${rangeStart}-${rangeEnd}首`;
    
    // 等级名称
    const level = baseConfig.name;
    
    // 生成评价语
    const summaries = {
        1: [
            "你的诗词储备尚处于起步阶段，建议从课内必背诗词开始积累。",
            "你掌握了一定数量的基础古诗词，建议继续积累课内诗词。",
            "你已掌握小学阶段常见古诗词，基础扎实，可以继续挑战更高难度的诗词。"
        ],
        2: [
            "你的诗词储备达到初学水平，对常见诗词有一定了解。",
            "你掌握了相当数量的古诗词，基础较为扎实。",
            "你已掌握中小学常见古诗词，诗词储备较为丰富。"
        ],
        3: [
            "你的诗词储备达到基础水平，建议继续扩展诗词积累。",
            "你掌握了大量基础古诗词，理解能力不错。",
            "你已掌握初中必背古诗词，储备量处于中上水平。"
        ],
        4: [
            "你的诗词储备达到巩固水平，对经典诗词有较好掌握。",
            "你掌握了大量经典古诗词，储备量处于较高水平。",
            "你已掌握高中必背古诗词，诗词储备非常丰富。"
        ],
        5: [
            "你的诗词储备达到进阶水平，可以继续深入学习经典名篇。",
            "你掌握了大量进阶诗词，对各类题材都有涉猎。",
            "你已掌握高中拓展诗词，理解能力较强。"
        ],
        6: [
            "你的诗词储备达到精通水平，对冷门名篇也有涉猎。",
            "你掌握了大量精通级诗词，堪称诗词达人。",
            "你已掌握高难度诗词及冷门名篇，诗词储备深厚，堪称诗词大神！"
        ]
    };
    
    const overallCorrectRate = testState.correctCount / totalQuestions;
    let summary;
    if (overallCorrectRate >= 0.8) {
        summary = summaries[masteredLevel][2];
    } else if (overallCorrectRate >= 0.5) {
        summary = summaries[masteredLevel][1];
    } else {
        summary = summaries[masteredLevel][0];
    }
    
    return { level, range, summary, totalReserve };
}

// ===== 重新开始 =====
function restartTest() {
    switchPage('home');
}

// ===== 页面切换 =====
function switchPage(pageName) {
    elements.homePage.classList.remove('active');
    elements.testPage.classList.remove('active');
    elements.resultPage.classList.remove('active');
    
    if (pageName === 'home') {
        elements.homePage.classList.add('active');
    } else if (pageName === 'test') {
        elements.testPage.classList.add('active');
    } else if (pageName === 'result') {
        elements.resultPage.classList.add('active');
    }
}

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', init);
