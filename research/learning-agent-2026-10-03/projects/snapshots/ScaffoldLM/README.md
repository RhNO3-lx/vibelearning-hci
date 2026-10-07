# ScaffoldLM

ScaffoldLM is a planning-guided tutoring framework for multi-turn math dialogue. It equips large language models with explicit stepwise scaffolding by first deriving step-aligned pedagogical plans from solution traces, and then using these plans to synthesize coherent Socratic tutoring dialogues.

During tutoring, ScaffoldLM maintains an assessment-driven memory that tracks step-level progress, infers learner cognitive states, evaluates whether the current step target has been achieved, and adaptively selects tutoring actions. Experiments on multi-turn math tutoring benchmarks show that ScaffoldLM substantially improves pedagogical tutoring quality over strong baselines.


## Framework

![ScaffoldLM Framework](figures/framework.png)

## Project Layout

```text
.
├── data_synthesis/
│   ├── planning/
│   │   ├── generate_plan.py
│   │   ├── rule_filter.py
│   │   ├── model_filter.py
│   │   ├── format_training_data.py
│   │   ├── pipeline.py
│   │   ├── grader.py
│   │   └── prompts/
│   └── tutoring/
│       ├── generate_dialogues.py
│       ├── dialogue_filter.py
│       ├── format_training_data.py
│       ├── pipeline.py
│       └── prompts/
├── figures/
│   ├── framework.png
│   └── framework.pdf
├── model_serving/
│   ├── structured_tutor.py
│   └── interactive_cli.py
├── scripts/
│   └── train_sft.sh
├── environment.yml
├── requirements.txt
└── .gitignore
```

## Quick Start

### 1. Create a conda environment

```bash
conda env create -f environment.yml
conda activate scaffoldlm
```

### 2. Set your API credentials

For OpenAI-compatible APIs:

```bash
export OPENAI_API_KEY=your_api_key
export OPENAI_BASE_URL=http://localhost:8000/v1
```

If you use the official OpenAI endpoint, `OPENAI_BASE_URL` can be omitted.

The provided `environment.yml` installs the base Python environment and pulls Python packages from `requirements.txt`. The requirements file covers the Python-level imports used by this repository. If your setup needs CUDA-specific wheels for PyTorch, vLLM, FlashAttention, or DeepSpeed, install those variants after activating the conda environment.

## Data Synthesis

### Planning stage

```bash
python data_synthesis/planning/pipeline.py \
  --input path/to/math_questions.jsonl \
  --output-dir outputs/planning \
  --solve-model your_model_name \
  --plan-model your_model_name \
  --verifier-model your_judge_model
```

This produces:

- generated plans
- rule-filtered plans
- model-filtered plans
- formatted plan SFT data

### Tutoring stage

```bash
python data_synthesis/tutoring/pipeline.py \
  --input outputs/planning/03_model_filtered_plans.jsonl \
  --output-dir outputs/tutoring \
  --user-model your_student_model \
  --assistant-model your_tutor_model \
  --filter-model your_judge_model
```

This produces:

- generated tutoring dialogues
- filtered sessions
- formatted tutor SFT data

## Interactive Tutoring

Run the structured tutor locally:

```bash
python model_serving/interactive_cli.py \
  --backend api \
  --model your_tutor_model \
  --api-key "$OPENAI_API_KEY"
```

Or use a local vLLM backend:

```bash
python model_serving/interactive_cli.py \
  --backend vllm \
  --model-path path/to/local/model
```

The tutor will:

1. decompose the problem internally
2. generate the first tutoring turn
3. track progress over hidden sub-questions
4. continue until it emits an explicit end-of-session response

## Models

https://huggingface.co/ffffddddsss/scaffoldLM-7B

## Training

A generic supervised fine-tuning launcher is provided in:

```bash
scripts/train_sft.sh
```

It expects two jsonl files:

- planning SFT data
- tutoring SFT data

By default, the script looks for them under:

```text
data/plan_train.jsonl
data/tutor_train.jsonl
```

You can override every path with environment variables.

License: CC-BY-4.0

## Citation

Coming soon.
