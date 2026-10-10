import { useState } from "react";
import {
  ArrowRight,
  RotateCcw,
  Check,
  Layers,
  Terminal,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import type { Action, Turn } from "../model";

export function LearningCards({
  turn,
  dispatch,
}: {
  turn: Turn;
  dispatch: (action: Action) => void;
}) {
  const [showHint, setShowHint] = useState(false);
  return (
    <>
      {turn.quiz && (
        <section className="quiz-card" aria-label="诊断练习卡片">
          <div className="card-eyebrow">
            <span>
              <Lightbulb size={15} /> 检查一下你的理解
            </span>
            <span className="micro-badge">演示题</span>
          </div>
          <h4>{turn.quiz.prompt}</h4>
          <div className="quiz-options">
            {turn.quiz.options.map((option, i) => (
              <button
                key={option}
                disabled={turn.quiz!.submitted}
                className={`quiz-option ${turn.quiz!.selected === i ? "chosen" : ""} ${turn.quiz!.submitted && turn.quiz!.answer === i ? "correct" : ""} ${turn.quiz!.submitted && turn.quiz!.selected === i && turn.quiz!.answer !== i ? "incorrect" : ""}`}
                onClick={() =>
                  dispatch({ type: "quizChoice", id: turn.id, index: i })
                }
                aria-pressed={turn.quiz!.selected === i}
              >
                <span className="option-letter">{"ABC"[i]}</span>
                {option}
                {turn.quiz!.submitted && turn.quiz!.answer === i && (
                  <Check size={17} />
                )}
              </button>
            ))}
          </div>
          {turn.quiz.submitted ? (
            <div className="quiz-feedback" role="status">
              <strong>
                {turn.quiz.selected === turn.quiz.answer
                  ? "这次判断正确。"
                  : "再看一下“组成一组基”这个条件。"}
              </strong>
              <p>{turn.quiz.explanation}</p>
              <small>已记录一次演示作答；不代表长期掌握。</small>
            </div>
          ) : (
            <div className="card-footer">
              <span>独立作答 · 单选</span>
              <button
                className="btn small primary"
                disabled={turn.quiz.selected === undefined}
                onClick={() => dispatch({ type: "quizSubmit", id: turn.id })}
              >
                提交答案 <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      )}
      {turn.flashcard && (
        <section className="flashcard" aria-label="闪卡回顾">
          <div className="card-eyebrow">
            <span>
              <Layers size={15} /> 闪卡回顾
            </span>
            <span>{turn.flashcard.flipped ? "答案" : "先试着回忆"}</span>
          </div>
          <button
            className="flashcard-face"
            onClick={() => dispatch({ type: "flashcard", id: turn.id })}
          >
            {turn.flashcard.flipped
              ? turn.flashcard.back
              : turn.flashcard.front}
            <small>
              <RotateCcw size={13} /> 点击翻面
            </small>
          </button>
          <div className="card-footer">
            <span>
              {turn.flashcard.rating
                ? `自评：${turn.flashcard.rating === "known" ? "记得" : "再复习"}`
                : "自评不计入掌握分数"}
            </span>
            <div className="button-row">
              <button
                className="btn small"
                onClick={() =>
                  dispatch({ type: "flashcard", id: turn.id, rating: "again" })
                }
              >
                再复习
              </button>
              <button
                className="btn small primary"
                onClick={() =>
                  dispatch({ type: "flashcard", id: turn.id, rating: "known" })
                }
              >
                记得了
              </button>
            </div>
          </div>
        </section>
      )}
      {turn.projectChecks && (
        <section className="project-card" aria-label="项目实践清单">
          <div className="card-eyebrow">
            <span>
              <Terminal size={15} /> 从理解到实践
            </span>
            <span className="micro-badge">进度自评</span>
          </div>
          <h4>一个小实验，验证你的想法</h4>
          {[
            "写出输入、输出与成立条件",
            "构造一个边界情况或反例",
            "运行测试，并解释结果",
          ].map((step, i) => (
            <label className="project-step" key={step}>
              <input
                type="checkbox"
                checked={turn.projectChecks![i]}
                onChange={() =>
                  dispatch({ type: "projectCheck", id: turn.id, index: i })
                }
              />
              <span>{step}</span>
              {turn.projectChecks![i] && <CheckCircle2 size={15} />}
            </label>
          ))}
          <button
            className="text-button"
            onClick={() => setShowHint((v) => !v)}
          >
            {showHint ? "收起起步建议" : "查看起步建议"}{" "}
            <ArrowRight size={13} />
          </button>
          {showHint && (
            <div className="project-hint">
              <p>
                先写一个最小例子，再比较正常输入与边界输入。记录“预期什么、观察到什么、为什么”。
              </p>
              <code>
                def test_boundary_case():
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;assert actual == expected
              </code>
              <small>此处仅展示代码片段，未执行命令。</small>
            </div>
          )}
        </section>
      )}
    </>
  );
}
