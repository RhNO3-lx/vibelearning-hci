# Teaching According to Students' Aptitude: Personalized Mathematics Tutoring via Persona-, Memory-, and Forgetting-Aware LLMs

[![Paper](https://img.shields.io/badge/Paper-AAAI%202026-blue)](https://arxiv.org/abs/2511.15163)
[![PDF](https://img.shields.io/badge/PDF-Download-red)](https://arxiv.org/pdf/2511.15163.pdf)
[![arXiv](https://img.shields.io/badge/arXiv-2511.15163-b31b1b.svg)](https://arxiv.org/abs/2511.15163)

**Official implementation of "Teaching According to Students' Aptitude: Personalized Mathematics Tutoring via Persona-, Memory-, and Forgetting-Aware LLMs"**

*Yang Wu, Rujing Yao, Tong Zhang, Yufei Shi, Zhuoren Jiang, Zhushan Li, Xiaozhong Liu*

**Accepted by:** AAAI 2026 Workshop

---

## Overview

Large Language Models (LLMs) are increasingly integrated into intelligent tutoring systems, but most existing approaches fail to capture how students' knowledge evolves dynamically across proficiencies, conceptual gaps, and **forgetting patterns**. This challenge is particularly acute in mathematics tutoring, where effective instruction requires fine-grained scaffolding precisely calibrated to each student's mastery level and **cognitive retention**.

**TASA (Teaching According to Students' Aptitude)** is a student-aware tutoring framework that integrates three synergistic components for personalized mathematics learning:

- **🎭 Persona Modeling**: Constructs structured student profiles capturing proficiency and traits across skills
- **💾 Event Memory**: Records prior learning interactions with temporal information
- **⏰ Forgetting-Aware Dynamics**: Continuously estimates knowledge retention using temporal decay models grounded in cognitive psychology

Unlike existing personalization methods that treat retrieved student information as static snapshots, TASA dynamically adjusts tutoring responses by applying **temporal decay** to retrieved persona and memory, enabling instruction based on temporally decayed mastery estimates.

### Key Features

- **Temporal Forgetting Modeling**: Integrates forgetting curves with knowledge tracing (LPKT, DKT, AKT, SimpleKT)
- **Hybrid RAG Retrieval**: Lambda-weighted fusion of persona descriptions and keywords using BGE-M3 embeddings
- **Multi-LLM Support**: Compatible with gpt-oss-120b, Llama-3.1-8B, and Qwen3-4B backbones
- **Comprehensive Evaluation**: Tested on 4 mathematics tutoring benchmarks (Assist2017, NIPS34, Algebra2005, Bridge2006)

---

## Environment Setup

Install the required dependencies:

```bash
# Clone the repository
git clone https://github.com/YANGWU001/TASA.git
cd TASA

# Create conda environment
conda create -n tasa python=3.10 -y
conda activate tasa

# Install PyTorch with CUDA support
pip install torch==2.5.0 torchvision==0.20.0 torchaudio==2.5.0 \
    --index-url https://download.pytorch.org/whl/cu124

# Install dependencies
pip install -r requirements.txt

# Install pykt-toolkit for knowledge tracing
git clone https://github.com/pykt-team/pykt-toolkit.git
cd pykt-toolkit && pip install -e . && cd ..
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API credentials
nano .env
```

For detailed installation instructions, see [INSTALL.md](./INSTALL.md).

---

## Quick Start

### Step 1: Download Datasets

```bash
# Download and prepare all datasets
bash scripts/download_datasets.sh
```

### Step 2: Create Student Bank

```bash
# Generate student persona, memory, and embeddings
python scripts/create_student_bank.py \
    --dataset assist2017 \
    --num-students 100
```

### Step 3: Train Knowledge Tracing Models

```bash
# Train LPKT model for forgetting score estimation
python scripts/train_kt_models.py \
    --dataset assist2017 \
    --model lpkt \
    --epochs 100
```

### Step 4: Run TASA Tutoring

```bash
# Run TASA with Llama backbone
python scripts/run_tasa.py \
    --dataset assist2017 \
    --backbone llama \
    --forgetting-method lpkt \
    --num-rounds 10
```

### Step 5: Evaluate Results

```bash
# Evaluate learning gains
python scripts/evaluate_results.py \
    --method TASA \
    --dataset assist2017
```

---

## Datasets

We evaluate TASA on four mathematics tutoring benchmarks:

| Dataset | Students | Questions | Knowledge Concepts | Interactions | Domain |
|---------|----------|-----------|-------------------|--------------|--------|
| **Assist2017** | 1,708 | 3,162 | 102 | 942,816 | K-12 Mathematics |
| **NIPS34** | 4,918 | 948 | 57 | 1,382,727 | Mathematics Diagnostics |
| **Algebra2005** | 574 | 210,710 | 112 | 809,694 | Algebra |
| **Bridge2006** | 1,138 | 207,856 | 493 | 3,679,199 | Pre-Algebra |

📖 See [DATASETS.md](./DATASETS.md) for detailed descriptions, download links, and citations.

**Note**: After running the experiments, the following directories will be generated:
- `data/` - Preprocessed datasets and trained KT models
- `bank/` - Student profiles (persona, memory, dialogue history)
- `results/` - Experimental results for each method

---

## Project Structure

```
TASA/
├── src/                         # Source code
│   ├── tasa/                    # Core TASA implementation
│   │   ├── tutoring.py         # Main tutoring logic with forgetting-aware prompting
│   │   ├── rag.py              # RAG retrieval for persona and memory
│   │   ├── rag_lambda.py       # Lambda-weighted RAG (ablation study)
│   │   └── rewrite.py          # Mastery-aware content rewriter
│   ├── knowledge_tracing/      # KT models (LPKT, DKT, AKT, SimpleKT)
│   └── utils/                  # Utility functions
│
├── scripts/                    # Executable scripts
│   ├── run_tasa.py            # Run TASA experiments
│   ├── create_student_bank.py # Create student bank
│   └── train_kt_models.py     # Train knowledge tracing models
│
├── data/                       # Datasets (after download)
├── bank/                       # Student bank (persona, memory, session)
├── results/                    # Evaluation results
└── README.md
```

See [src/README.md](./src/README.md) for detailed code documentation.

---

## Citation

If you find this work useful, please cite our paper:

```bibtex
@misc{wu2025teachingaccordingstudentsaptitude,
  title={Teaching According to Students' Aptitude: Personalized Mathematics Tutoring via Persona-, Memory-, and Forgetting-Aware LLMs}, 
  author={Yang Wu and Rujing Yao and Tong Zhang and Yufei Shi and Zhuoren Jiang and Zhushan Li and Xiaozhong Liu},
  year={2025},
  eprint={2511.15163},
  archivePrefix={arXiv},
  primaryClass={cs.CL},
  url={https://arxiv.org/abs/2511.15163}
}
```

---

## Acknowledgments

This work builds upon:
- [PyKT-Toolkit](https://github.com/pykt-team/pykt-toolkit) for knowledge tracing models
- [FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding) for BGE-M3 embeddings
- [Transformers](https://github.com/huggingface/transformers) for LLM integration

---

## Contact

For questions or issues, please:
- Open an issue on GitHub
- Contact the authors: Yang Wu (ywu19@wpi.edu), Xiaozhong Liu (xliu14@wpi.edu)

**Paper:** [https://arxiv.org/abs/2511.15163](https://arxiv.org/abs/2511.15163)  
**PDF:** [https://arxiv.org/pdf/2511.15163.pdf](https://arxiv.org/pdf/2511.15163.pdf)

---

## License

This project is released for research purposes. Please cite our paper if you use this code or datasets in your research.
