# RuleMaze 数据生成与训练流程

## 数据下载

敬请期待。

## 概览

完整流程分为三个阶段：

```text
┌──────────────────────────────────────────────────────────────┐
│  阶段 1: Generate_rule_maze                                  │
│  生成规则 -> 选择训练规则集 -> 生成/提取验证代码             │
│  -> 生成迷宫池 -> 匹配规则与迷宫                             │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │  matched_mazes.json
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  阶段 2: Training_Dataset_Preparation                        │
│  加载匹配数据 -> 切分训练/测试集 -> 合并全难度 JSON          │
│  -> 生成训练轨迹                                             │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │  *_traj_with_step_images.jsonl
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  阶段 3: DMP                                                 │
│  转换为 SFT 格式 -> LLaMA-Factory 训练 -> 逐检查点评估       │
└──────────────────────────────────────────────────────────────┘
```

## 目录结构

```text
.
├── DataGeneration/
│   ├── path_setting/
│   │   └── local_setting.yml               # 所有路径的统一配置入口
│   ├── Generate_rule_maze/                 # 阶段 1: 数据生成流水线
│   │   ├── generate_data_pipeline.py       # 总控 pipeline，按状态串联执行
│   │   ├── common.py                       # 阶段 1 运行时配置、路径常量与 LLM 初始化
│   │   ├── generate_maze.py                # 迷宫生成基础逻辑
│   │   ├── LLM_Agent.py                    # LLM 调用封装
│   │   ├── states/
│   │   │   ├── state_1_generate_rules.py
│   │   │   ├── state_2_select_rules.py
│   │   │   ├── state_3_generate_validator_code.py
│   │   │   ├── state_4_extract_validator_code.py
│   │   │   ├── state_5_generate_maze_pool.py
│   │   │   └── state_6_match_mazes.py
│   │   └── apikey.yaml                     # API 密钥
│   ├── Training_Dataset_Preparation/       # 阶段 2: 训练数据集准备
│   │   ├── Build_Training_Dataset/         # 构建训练数据集
│   │   │   ├── build_training_dataset.py   # 总控 pipeline，按状态串联执行
│   │   │   ├── common.py                   # 阶段 2 运行时配置与路径常量
│   │   │   ├── states/
│   │   │   │   ├── state_1_load_raw_data.py
│   │   │   │   ├── state_2_split_datasets.py
│   │   │   │   └── state_3_combine_datasets.py
│   │   │   ├── separate_regular.json
│   │   │   ├── separate_quest.json
│   │   │   └── separate_test.json
│   │   └── Generate_Training_Trajectories/
│   │       └── generate_training_trajectories.py
│   ├── Function/                           # 迷宫操作工具函数
│   ├── Utils/
│   │   └── utils.py                        # get_config() 等公共工具
│   └── legend_images/                      # 迷宫图例图片资源
│       ├── regular/
│       └── quest/legend/
├── DMP/                                    # 阶段 3: 格式转换、训练与评估
│   ├── scripts/
│   │   ├── convert_maze_trajectory_to_sft.py # 轨迹 step 数据 -> SFT 格式
│   │   ├── convert_maze_raw_paths_to_sft.py  # 原始匹配路径数据 -> SFT 格式
│   │   ├── prepare_stage3_datasets.py        # 批量转换入口
│   │   ├── eval_maze_checkpoint.py           # 单 checkpoint 推理评估
│   │   ├── eval_maze_checkpoints.py          # 逐 checkpoint 批量评估
│   │   └── maze_sft_utils.py                 # 转换/评估共享工具
│   ├── examples/
│   │   ├── train_lora/
│   │   │   ├── qwen25vl_3b_maze_lora_sft_both.yaml # 正确+错误轨迹训练
│   │   │   ├── qwen25vl_3b_maze_lora_sft.yaml      # 仅正确轨迹训练
│   │   │   └── qwen25vl_3b_maze_vallina_sft.yaml   # 原始格式训练
│   │   └── inference/
│   │       ├── qwen25vl_3b_maze_lora_predict_both.yaml
│   │       ├── qwen25vl_3b_maze_lora_predict.yaml
│   │       └── qwen25vl_3b_maze_vallina_predict.yaml
├── DATA/                                   # 所有阶段产物
│   ├── Training_Data/                      # 阶段 3 SFT JSON 与 dataset_info.json
│   └── Training_Result/                    # 阶段 3 训练检查点与评估结果
├── requirements.txt
└── README.md
```

## 安装

### 环境要求

- Python 3.10+
- Conda

### 1. 克隆仓库

```bash
git clone <repo_url>
cd RULEMAZE
```

### 2. 创建并激活 Conda 环境

```bash
conda create -n rulemaze python=3.10 -y
conda activate rulemaze
```

### 3. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 4. 安装 LLaMA-Factory

阶段 3 的训练与推理依赖 LLaMA-Factory，请参考 [LLaMA-Factory 官方文档](https://github.com/hiyouga/LLaMA-Factory) 完成安装。

## 前置准备

### 1. 配置路径

配置文件：`DataGeneration/path_setting/local_setting.yml`

阶段 1、阶段 2 和轨迹生成脚本的路径统一由该文件管理。路径类配置不再通过 CLI 参数传入；切换服务器、调整产物根目录、修改文件名模板时，优先修改 `local_setting.yml`。

```yaml
BASED_DIR: /home/chenyu/Documents/MyFolder/RULEMAZE_PUB_REC/RuleMaze
MODEL_DIR: /network_space/server127_2/shared/chenyu/model
MODEL_NAME:
    QWEN: Qwen/Qwen2.5-VL-3B-Instruct
    CLIP: AI-ModelScope/clip-vit-large-patch14

DATA_ROOT_DIR: DATA
MAZE_GENERATION_DIR: Generate_rule_maze
MAZE_POOL_DIR: Mazes_Pool
MAZE_SIZE: 3
NUM_MAZES: 1000
NUM_PROCESSES: 10
RULES_SAVED_PATH: maze_navigation_rules.json
RULE_SETS_DIR: rule_sets
VALIDATOR_CODE_DIR: maze_navigation_rules/rules_w_code
VALIDATOR_CODE_DIR_NAME: code
VALIDATOR_CODE_FILE_NAME: rules_checking_code_new.py
RULE_WITH_CODE_SUFFIX: _with_code.json
MATCHED_MAZES_DIR_NAME: matched_mazes
MATCHED_MAZES_DIR_TEMPLATE: "{matched_mazes_dir_name}_{maze_size}"
MATCHED_MAZES_FILE_TEMPLATE: "{file_name}.json"
RULE_SET_DIR_TEMPLATE: "rule_set_{rule_index}"
MAZE_IMAGES_DIR_NAME: maze_images
MAZE_SIZE_DIR_TEMPLATE: "maze_size_{maze_size}"
MAZE_POOL_DIFFICULTY_DIR_TEMPLATE: "{difficulty}_{loop_percent}"
GENERATED_MAZES_DIR_TEMPLATE: "generated_mazes_{count_start}_{count_end}"
GENERATED_MAZES_FILE_TEMPLATE: "generated_mazes_{count_start}_{count_end}.json"
MAZE_BATCH_FILE_TEMPLATE: "{batch_dir}.json"
MAZE_IMAGE_FILE_TEMPLATE: "maze_{maze_index}.png"
SCENE_DIR:
    regular: regular_scene
    quest: quest_scene

RULEMAZE_DATASET_DIR: RuleMaze_Dataset
MAZE_DATA_PATH: matched_mazes
TRAINING_DATASET_REF: separate_quest.json
RAW_TRAIN_TEST_DIR_NAME: raw_train_test_data
COMBINE_DATASETS_DIR_NAME: process_datasets
TRAIN_SAMPLES_PER_RULE: 200
TEST_SAMPLES_PER_DIFFICULTY: 100
SAVED_RAW_TRAIN_DATA_FILE_NAME: saved_raw_train_data.json
SAVED_RAW_TEST_DATA_FILE_NAME: saved_raw_test_data.json
DATASET_SPLIT_FILE_TEMPLATE: "{dataset_type}_{difficulty}.json"
COMBINED_TRAIN_DATASET_FILE_NAME: combined_train_all_difficulties.json
COMBINED_TEST_UNSEEN_DATASET_FILE_NAME: combined_test_unseen_all_difficulties.json
COMBINED_TEST_SEEN_DATASET_FILE_NAME: combined_test_seen_all_difficulties.json
TRAJECTORIES_DIR_NAME: trajectories

APIKEY_PATH: Generate_rule_maze/apikey.yaml
```

当前 `local_setting.yml` 下，所有生成产物都会放在：

```text
/home/chenyu/Documents/MyFolder/RULEMAZE_PUB_REC/RuleMaze/DATA/
```

常用输出路径：

| 产物 | 路径规则 |
| --- | --- |
| 产物总目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/` |
| 阶段 1 根目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/` |
| 阶段 1 场景目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/` |
| 阶段 1 迷宫池根目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${MAZE_POOL_DIR}/${SCENE_DIR[mode]}/maze_size_<MAZE_SIZE>/` |
| 阶段 2 根目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/` |
| 阶段 2 raw 数据目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/raw_train_test_data/` |
| 阶段 2 processed 数据目录 | `${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/` |

### 2. 配置 API 密钥

在 `DataGeneration/Generate_rule_maze/apikey.yaml` 中填入密钥和 API 基础地址：

```yaml
API_KEY: your_api_key_here
API_BASE: https://yunwu.ai/v1
```

> 使用代理时填写 `API_BASE`；直连官方服务时可按实际脚本要求省略或留空。

## 阶段 1：生成规则迷宫数据

工作目录：`DataGeneration/`

总入口：`Generate_rule_maze/generate_data_pipeline.py`

流水线分为 6 个状态，按顺序依次执行。

通用运行格式：

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state <1-6> \
  --mode regular
```

`--setting` 选择 `path_setting/<setting>.yml`，`--mode` 选择 `regular` 或 `quest`。路径、场景目录、迷宫池目录、匹配文件名和状态 5 的迷宫生成配置均来自 setting；CLI 只保留状态选择、场景类型和状态 1/2 的生成轮次或规则数量。各状态产物使用固定路径；状态 1 检查到规则文件已存在时会提示已有规则数量并询问是否继续追加，其他状态再次运行时如果目标产物已经存在，会直接返回。

下文中的 `${DATA_ROOT}` 指 `${BASED_DIR}/${DATA_ROOT_DIR}`。

阶段 1 输入/输出总览：

| 状态 | 主要输入 | 主要输出 |
| --- | --- | --- |
| 1 | `APIKEY_PATH` 和 LLM 配置 | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/${RULES_SAVED_PATH}` |
| 2 | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/${RULES_SAVED_PATH}` | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/${RULE_SETS_DIR}/<Difficulty>.json` |
| 3 | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/${RULE_SETS_DIR}/<Difficulty>.json` | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/${VALIDATOR_CODE_DIR}/<Difficulty>_with_code.json` |
| 4 | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/${VALIDATOR_CODE_DIR}/<Difficulty>_with_code.json` | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/${VALIDATOR_CODE_DIR}/${VALIDATOR_CODE_DIR_NAME}/<Difficulty>/rule_set_<i>/${VALIDATOR_CODE_FILE_NAME}` |
| 5 | setting 中的场景、图例、`MAZE_SIZE`、`NUM_MAZES` 和 `NUM_PROCESSES` | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${MAZE_POOL_DIR}/${SCENE_DIR[mode]}/maze_size_<MAZE_SIZE>/<pool_difficulty>/generated_mazes_<start>_<end>/` |
| 6 | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/${VALIDATOR_CODE_DIR}/<Difficulty>_with_code.json`、`${VALIDATOR_CODE_DIR_NAME}/<Difficulty>/...`、maze pool | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/${VALIDATOR_CODE_DIR}/matched_mazes_<MAZE_SIZE>/<Difficulty>/rule_set_<i>/<pool_label>/matched_mazes.json` |

验证器执行规则：`_with_code.json` 只作为规则文本、函数名和 rule_set 顺序的索引文件；运行验证时统一加载 `${VALIDATOR_CODE_DIR}/${VALIDATOR_CODE_DIR_NAME}/<Difficulty>/rule_set_<i>/${VALIDATOR_CODE_FILE_NAME}` 下保存的 Python 文件。

代码组织：

| 文件/目录 | 作用 |
| --- | --- |
| `Generate_rule_maze/generate_data_pipeline.py` | 总控入口，只负责解析参数、读取 yml 配置并调度状态 |
| `Generate_rule_maze/common.py` | 阶段 1 运行时配置、路径变量和 LLM 初始化 |
| `Generate_rule_maze/states/state_*.py` | 每个状态的主要实现逻辑 |

### 状态 1：LLM 生成规则描述

子状态入口：`Generate_rule_maze/states/state_1_generate_rules.py`

通过 LLM 生成自然语言规则及其逻辑表示，保存到阶段 1 规则工作区：

输入：

```text
DataGeneration/Generate_rule_maze/apikey.yaml
```

输出：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/maze_navigation_rules.json
```

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 1 \
  --mode regular \
  --num_iterations 3
```

| 参数 | 说明 |
| --- | --- |
| `--mode` | `regular`（常规迷宫）或 `quest`（冒险迷宫） |
| `--num_iterations` | 调用 LLM 的轮次，每轮生成约 15 条规则 |

> 如果 `${RULES_SAVED_PATH}` 已存在，脚本会先显示当前规则总数，并询问是否继续运行大模型追加新规则。

### 状态 2：选择训练规则集

子状态入口：`Generate_rule_maze/states/state_2_select_rules.py`

从 `${RULES_SAVED_PATH}` 中选择规则，生成后续代码生成和数据集构建所需的规则集。运行时会先选择规则源文件。

输入目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/
```

输出目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rule_sets/Easy.json
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rule_sets/Medium.json
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rule_sets/Hard.json
```

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 2 \
  --mode regular \
  --num_rules 3
```

| 参数 | 说明 |
| --- | --- |
| `--num_rules` | 每个难度级别选择的规则集数量；当前每个规则集包含 1 条规则 |

### 状态 3：LLM 生成规则验证代码

子状态入口：`Generate_rule_maze/states/state_3_generate_validator_code.py`

为每条规则集生成验证代码响应，并保存为中间 JSON（`_with_code.json`）。该 JSON 用于记录规则文本、函数名和生成响应；后续真正执行验证器时不直接执行 JSON 里的 `generated_code` 字段。

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 3 \
  --mode regular
```

输入目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rule_sets/
```

输出：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/Easy_with_code.json
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/Medium_with_code.json
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/Hard_with_code.json
```

已存在的 `<Difficulty>_with_code.json` 会按文件跳过，不会阻塞其他难度。

### 状态 4：提取验证代码到 `.py` 文件

子状态入口：`Generate_rule_maze/states/state_4_extract_validator_code.py`

将 JSON 中的代码字段提取为独立的 `rules_checking_code_new.py`。提取后，state 6 和通用规则验证入口都会执行这里保存的 `.py` 文件，而不是 `_with_code.json` 中的代码字段。

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 4 \
  --mode regular
```

输入目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/
```

输出目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/${VALIDATOR_CODE_DIR_NAME}/<Difficulty>/rule_set_<i>/${VALIDATOR_CODE_FILE_NAME}
```

已存在的 `rules_checking_code_new.py` 会按 rule_set 跳过。

### 状态 5：生成迷宫池

子状态入口：`Generate_rule_maze/states/state_5_generate_maze_pool.py`

并行生成随机迷宫，保存到 setting 指定的迷宫池根目录：

输入：

```text
setting 中的 SCENE_DIR、MAZE_POOL_DIR、MAZE_SIZE、NUM_MAZES、NUM_PROCESSES 和图例路径
```

输出根目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${MAZE_POOL_DIR}/${SCENE_DIR[mode]}/maze_size_<MAZE_SIZE>/
```

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 5 \
  --mode regular
```

| setting 参数 | 说明 |
| --- | --- |
| `MAZE_SIZE` | 迷宫逻辑网格边长（`3` = 3x3 迷宫） |
| `NUM_MAZES` | 生成迷宫总数 |
| `NUM_PROCESSES` | 并行进程数 |

当前默认难度目录为 `easy_10`，批次输出形如：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/Mazes_Pool/regular_scene/maze_size_3/easy_10/generated_mazes_0_100/generated_mazes_0_100.json
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/Mazes_Pool/regular_scene/maze_size_3/easy_10/generated_mazes_0_100/maze_images/maze_<index>.png
```

迷宫池目录由 `MAZE_POOL_DIR`、`SCENE_DIR`、`MAZE_SIZE` 和 `MAZE_SIZE_DIR_TEMPLATE` 决定。已存在的 size/difficulty 目录会按难度跳过。

### 状态 6：规则-迷宫匹配

子状态入口：`Generate_rule_maze/states/state_6_match_mazes.py`

遍历迷宫池，为每条规则集筛选满足/违反规则的迷宫。运行后先选择目标 `<Difficulty>_with_code.json`，所以需要分别为 `Easy`、`Medium`、`Hard` 运行。`_with_code.json` 只用于读取规则文本、函数名和 rule_set 顺序；实际验证代码从 `rules_w_code/code/<Difficulty>/rule_set_<i>/rules_checking_code_new.py` 加载。检查也是按 difficulty 子目录进行，不会因为 `matched_mazes_<MAZE_SIZE>/` 根目录存在就直接退出。

```bash
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 6 \
  --mode regular
```

输入规则与代码：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/<Difficulty>_with_code.json
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/${VALIDATOR_CODE_DIR_NAME}/<Difficulty>/rule_set_<i>/${VALIDATOR_CODE_FILE_NAME}
```

输入迷宫池：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${MAZE_POOL_DIR}/${SCENE_DIR[mode]}/maze_size_<MAZE_SIZE>/
```

输出匹配结果：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/matched_mazes_<MAZE_SIZE>/<Difficulty>/rule_set_<i>/<pool_label>/matched_mazes.json
```

默认 `<pool_label>` 为 `Mazes_Pool/maze_size_3`。`matched_mazes_3` 目录名由 `MATCHED_MAZES_DIR_TEMPLATE: "{matched_mazes_dir_name}_{maze_size}"` 和 `MAZE_SIZE: 3` 生成；`matched_mazes.json` 文件名由 `MATCHED_MAZES_FILE_TEMPLATE: "{file_name}.json"` 和 `MAZE_DATA_PATH: matched_mazes` 保持一致，供阶段 2 直接读取。

## 阶段 2：训练数据集准备

工作目录：`DataGeneration/`

### 总入口 A：构建训练数据集

总入口：`Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py`

将阶段 1 的匹配迷宫数据整理为训练/测试数据集。

通用运行格式：

```bash
python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state <1-3> \
  --mode regular
```

阶段 2 读取 `MAZE_DATA_PATH`、`TRAINING_DATASET_REF` 和 `RULEMAZE_DATASET_DIR`。这些路径均来自 setting，不再通过 CLI 参数传入。各状态产物使用固定路径；再次运行时如果目标产物已经存在，会直接返回。

阶段 2 输入/输出总览：

| 状态 | 主要输入 | 主要输出 |
| --- | --- | --- |
| 1 | 阶段 1 `matched_mazes_<MAZE_SIZE>/<Difficulty>/rule_set_<i>/<pool_label>/matched_mazes.json` 和 `TRAINING_DATASET_REF` | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/raw_train_test_data/saved_raw_train_data.json` 和 `saved_raw_test_data.json` |
| 2 | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/raw_train_test_data/` | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/<dataset_type>_<Difficulty>.json` |
| 3 | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/train_<Difficulty>.json`、`test_seen_<Difficulty>.json` 和 `test_unseen_<Difficulty>.json` | `combined_train_all_difficulties.json`、`combined_test_seen_all_difficulties.json` 和 `combined_test_unseen_all_difficulties.json` |
| 轨迹 | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/<target>.json` | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/trajectories/` |

代码组织：

| 文件/目录 | 作用 |
| --- | --- |
| `Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py` | 总控入口，只负责解析参数、读取 yml 配置并调度状态 |
| `Training_Dataset_Preparation/Build_Training_Dataset/common.py` | 阶段 2 运行时配置和路径变量 |
| `Training_Dataset_Preparation/Build_Training_Dataset/states/state_*.py` | 每个构建状态的主要实现逻辑 |
| `Training_Dataset_Preparation/Build_Training_Dataset/separate_*.json` | Train/Test 规则划分文件 |

### 状态 1：加载并标注原始 matched-maze 数据

子状态入口：`Training_Dataset_Preparation/Build_Training_Dataset/states/state_1_load_raw_data.py`

从阶段 1 的匹配结果目录读取 `matched_mazes.json`，按 `TRAINING_DATASET_REF` 的规则划分加载并打标签。读取路径形如：

输入：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${MAZE_GENERATION_DIR}/${SCENE_DIR[mode]}/maze_navigation_rules/rules_w_code/matched_mazes_<MAZE_SIZE>/<Difficulty>/rule_set_<i>/<pool_label>/matched_mazes.json
DataGeneration/Training_Dataset_Preparation/Build_Training_Dataset/separate_quest.json
```

```bash
python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state 1 \
  --mode regular
```

输出目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/raw_train_test_data/
```

输出文件：

```text
saved_raw_train_data.json
saved_raw_test_data.json
```

两个 raw 文件都存在时会直接返回；如果只存在一个，会报 partial output，避免静默漏生成。

### 状态 2：拆分训练集、seen-rule scene-in-train 测试集和 unseen 测试集

子状态入口：`Training_Dataset_Preparation/Build_Training_Dataset/states/state_2_split_datasets.py`

从 `raw_train_test_data/` 读取状态 1 产物，按难度拆分并写入百分比目录。`test_seen_*` 使用 seen-rule、scene-in-train 策略生成：规则来自训练规则，迷宫 scene 也必须出现在训练集中，但样本本身不进入训练集。

输入目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/raw_train_test_data/
```

```bash
python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state 2 \
  --mode regular
```

输出目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/
```

state 2 的数据量也由 `local_setting.yml` 控制：

```yaml
TRAIN_SAMPLES_PER_RULE: 200
TEST_SAMPLES_PER_DIFFICULTY: 100
```

`train_*` 每条规则最多取 `TRAIN_SAMPLES_PER_RULE` 条；`test_seen_*` 使用 seen-rule、scene-in-train 逻辑生成，每个难度最多取 `TEST_SAMPLES_PER_DIFFICULTY` 条；`test_unseen_*` 每个难度最多取 `TEST_SAMPLES_PER_DIFFICULTY` 条。常见输出：

```text
train_Easy.json
train_Medium.json
train_Hard.json
test_seen_Easy.json
test_seen_Medium.json
test_seen_Hard.json
test_unseen_Easy.json
test_unseen_Medium.json
test_unseen_Hard.json
```

已存在的 split 文件会按文件跳过，不会阻塞其他难度或其他 dataset type。

### 状态 3：合并全难度数据集

子状态入口：`Training_Dataset_Preparation/Build_Training_Dataset/states/state_3_combine_datasets.py`

合并状态 2 生成的各难度数据，产出全难度训练集、seen 测试集和 unseen 测试集。

输入目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[mode]}/process_datasets/
```

```bash
python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state 3 \
  --mode regular
```

常见输出文件：

```text
combined_train_all_difficulties.json
combined_test_seen_all_difficulties.json
combined_test_unseen_all_difficulties.json
```

这三个文件保存在 `process_datasets/` 目录下。

### 总入口 B：生成训练轨迹

总入口：`Training_Dataset_Preparation/Generate_Training_Trajectories/generate_training_trajectories.py`

为训练/测试数据集生成逐步轨迹（含正确轨迹和错误轨迹），输出 `*_traj_with_step_images.jsonl`。

输入目录：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[scene]}/process_datasets/
```

```bash
python Training_Dataset_Preparation/Generate_Training_Trajectories/generate_training_trajectories.py \
  --setting local \
  --scene regular
```

```bash
python Training_Dataset_Preparation/Generate_Training_Trajectories/generate_training_trajectories.py \
  --setting local \
  --scene quest
```

关键参数：

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--scene` | `regular` 或 `quest` | - |
| `--debug` | 调试模式（小批量）；来自代码默认值，可由 CLI 开启 | `False` |

`--debug` 不从 yml 读取；默认值定义在脚本中。非 debug 模式会为输入数据中的每条样本生成正确轨迹和 wrong trajectory。
开启 `--debug` 时只抽取小样本，并输出便于检查的 `*_traj_with_step_images_debug.json`；debug JSON 使用 `indent=4` 保存。

> 交互式：运行后从 `${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[scene]}/process_datasets/` 选择目标 JSON 文件。轨迹输出到同级 `trajectories/` 目录下。

轨迹输出示例：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[scene]}/process_datasets/trajectories/combined_train_all_difficulties_trajectories_without_code_thought_traj_with_step_images.jsonl
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[scene]}/process_datasets/trajectories/combined_train_all_difficulties_trajectories_without_code_thought_traj_with_step_images_debug.json
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[scene]}/process_datasets/trajectories/combined_train_all_difficulties_trajectories_without_code_thought_traj_with_step_images_images/
```

## 阶段 3：DMP 格式转换、训练与评估

工作目录：`DMP/`

DMP 阶段只包含三类工作：把数据转换成 LLaMA-Factory SFT 格式、使用 LLaMA-Factory 做 SFT 训练、对训练得到的 checkpoint 做 evaluate。错误分析、通用 BLEU/ROUGE 和模型导出修复不属于此阶段脚本。

所有命令均在 `DMP/` 目录下执行。阶段 3 的输入路径、输出文件名和 dataset name 由 `DataGeneration/path_setting/local_setting.yml` 中的 `DMP_*` 配置和阶段 2 路径配置共同决定。转换后的 SFT 数据集放置于 `${BASED_DIR}/${DATA_ROOT_DIR}/Training_Data/`，训练检查点和评估结果放置于 `${BASED_DIR}/${DATA_ROOT_DIR}/Training_Result/`。

脚本职责：

| 脚本 | 职责 |
| --- | --- |
| `scripts/convert_maze_trajectory_to_sft.py` | 将阶段 2 轨迹 step 数据转换成 step-wise SFT 数据 |
| `scripts/convert_maze_raw_paths_to_sft.py` | 将原始 matched path 数据转换成端到端路径 SFT 数据 |
| `scripts/prepare_stage3_datasets.py` | 批量转换 train/test_unseen/test_seen 轨迹数据，并更新 `dataset_info.json` |
| `scripts/eval_maze_checkpoint.py` | 对单个 checkpoint 做推理并计算指标 |
| `scripts/eval_maze_checkpoints.py` | 遍历 `checkpoint-*`，逐个调用单 checkpoint 评估脚本 |
| `scripts/maze_sft_utils.py` | 公共 JSON/JSONL、dataset_info 和指标工具；不直接作为入口执行 |

### 步骤 A：转换数据为 SFT 格式

#### 方式 1：轨迹数据转换

推荐用于 step-wise 训练。每条 SFT 样本包含当前 step 图像、已完成动作代码和下一步目标代码。

输入：`generate_training_trajectories.py` 产出的 `*_traj_with_step_images.jsonl`。推荐使用阶段 3 路径入口自动定位阶段 2 轨迹文件并转换：

```bash
python scripts/prepare_stage3_datasets.py \
  --setting local \
  --scene regular \
  --split all
```

默认会读取：

```text
${BASED_DIR}/${DATA_ROOT_DIR}/${RULEMAZE_DATASET_DIR}/${SCENE_DIR[scene]}/${COMBINE_DATASETS_DIR_NAME}/${TRAJECTORIES_DIR_NAME}/
```

并转换以下文件：

```text
combined_train_all_difficulties_trajectories_without_code_thought_traj_with_step_images.jsonl
combined_test_unseen_all_difficulties_trajectories_without_code_thought_traj_with_step_images.jsonl
combined_test_seen_all_difficulties_trajectories_without_code_thought_traj_with_step_images.jsonl
```

输出至 `${BASED_DIR}/${DATA_ROOT_DIR}/Training_Data/`，并自动更新 `${BASED_DIR}/${DATA_ROOT_DIR}/Training_Data/${DMP_DATASET_INFO_FILE_NAME}`。

也可以手动调用底层转换脚本。训练集（正确 + 错误轨迹）：

```bash
python scripts/convert_maze_trajectory_to_sft.py \
  <轨迹文件路径>/combined_train_all_difficulties_trajectories_without_code_thought_traj_with_step_images.jsonl \
  ../DATA/Training_Data/maze_train_stepwise_sft_both.json \
  --dataset-name maze_train_stepwise_sft_both \
  --trajectory-source both \
  --add-wrong-trajectory-hint
```

测试集（未见规则集）：

```bash
python scripts/convert_maze_trajectory_to_sft.py \
  <轨迹文件路径>/combined_test_unseen_all_difficulties_trajectories_without_code_thought_traj_with_step_images.jsonl \
  ../DATA/Training_Data/maze_test_unseen_stepwise_sft_both.json \
  --dataset-name maze_test_unseen_stepwise_sft_both \
  --trajectory-source both \
  --add-wrong-trajectory-hint
```

`convert_maze_trajectory_to_sft.py` 关键参数：

| 参数 | 说明 |
| --- | --- |
| `--trajectory-source` | `trajectory`（正确）/ `wrong_trajectory`（错误）/ `both` |
| `--add-wrong-trajectory-hint` | 在正确轨迹 step-1 添加错误轨迹提示样本 |
| `--use-step0-image-path` | 每个 step 都使用 step 0 的图像路径 |
| `--retain-percent` | 保留比例，如 `50.0` 表示使用 50% 数据 |
| `--retain-difficulties` | 过滤难度，如 `Easy Medium` |
| `--dataset-name` | 打印 `dataset_info.json` 注册片段 |

`prepare_stage3_datasets.py` 会调用同一套转换逻辑。`path_setting/local_setting.yml` 中的 `DMP_*_SFT_FILE_NAME` 和 `DMP_*_DATASET_NAME` 只配置不含轨迹来源的 base 名：

```yaml
DMP_TRAIN_SFT_FILE_NAME: maze_train_stepwise_sft.json
DMP_TEST_UNSEEN_SFT_FILE_NAME: maze_test_unseen_stepwise_sft.json
DMP_TEST_SEEN_SFT_FILE_NAME: maze_test_seen_stepwise_sft.json
DMP_TRAIN_DATASET_NAME: maze_train_stepwise_sft
DMP_TEST_UNSEEN_DATASET_NAME: maze_test_unseen_stepwise_sft
DMP_TEST_SEEN_DATASET_NAME: maze_test_seen_stepwise_sft
```

脚本会根据会改变样本内容的参数自动追加后缀来区分实际输出文件名和 dataset name。常用参数：

| 参数 | 说明 |
| --- | --- |
| `--split` | `all` / `train` / `test_unseen` / `test_seen` |
| `--overwrite` | 已存在的 SFT 输出文件也重新转换 |
| `--no-update-dataset-info` | 只打印 dataset_info 片段，不写入文件 |

`--trajectory-source` 会追加主要后缀：

```text
--trajectory-source both
DATA/Training_Data/maze_train_stepwise_sft_both.json
DATA/Training_Data/maze_test_unseen_stepwise_sft_both.json
DATA/Training_Data/maze_test_seen_stepwise_sft_both.json

--trajectory-source trajectory
DATA/Training_Data/maze_train_stepwise_sft_trajectory.json

--trajectory-source wrong_trajectory
DATA/Training_Data/maze_train_stepwise_sft_wrong_trajectory.json
```

`dataset_info.json` 中的 key 使用同样的命名规则，例如 `maze_train_stepwise_sft_both`、`maze_train_stepwise_sft_trajectory`。`--no-wrong-trajectory-hint`、`--use-step0-image-path`、`--retain-percent` 和 `--retain-difficulties` 也会继续追加后缀，例如 `maze_train_stepwise_sft_trajectory_retain_50_diff_easy.json`。

#### 方式 2：原始匹配数据转换

用于端到端路径训练。每条 SFT 样本包含一张完整迷宫图，目标输出为完整动作序列。

输入：`build_training_dataset.py` 状态 2/3 产出的 `train_*.json` / `test_*.json`

```bash
python scripts/convert_maze_raw_paths_to_sft.py \
  <数据路径>/combined_train_all_difficulties.json \
  ../DATA/Training_Data/train_vallina_sft.json \
  --dataset-name maze_train_vallina \
  --response-style actions_only
```

`--response-style` 选项：

| 值 | 说明 |
| --- | --- |
| `actions_only` | 直接输出动作序列 `<ANSWER>...</ANSWER>` |
| `coordinates_then_actions` | 先输出坐标推理，再输出答案 |
| `ascii_then_actions` | 先输出 ASCII 迷宫布局，再输出答案 |
| `all_then_actions` | 先列出所有路径，再输出答案 |

#### 注册数据集到 LLaMA-Factory

使用 `prepare_stage3_datasets.py` 时会自动更新 `DATA/Training_Data/dataset_info.json`。如果手动调用 `convert_maze_trajectory_to_sft.py` 或 `convert_maze_raw_paths_to_sft.py`，则需要将输出的 `dataset_info.json` 片段添加至 `DATA/Training_Data/dataset_info.json`：

```json
{
  "maze_train_stepwise_sft_both": {
    "file_name": "maze_train_stepwise_sft_both.json",
    "formatting": "sharegpt",
    "columns": {
      "messages": "messages",
      "images": "images"
    },
    "tags": {
      "role_tag": "role",
      "content_tag": "content",
      "user_tag": "user",
      "assistant_tag": "assistant"
    }
  }
}
```

### 步骤 B：SFT 训练

#### 训练时间

在 4 张 4090 GPU 上训练完整配置时，训练时间大约为 12 小时。

训练直接使用 LLaMA-Factory CLI。在 `DMP/` 目录下执行，需提前设置环境变量：

```bash
export HF_ENDPOINT=https://hf-mirror.com
export WANDB_API_KEY=<your_wandb_key>
```

正确 + 错误轨迹训练（推荐）：

```bash
CUDA_VISIBLE_DEVICES=2,5,8,9 llamafactory-cli train \
  examples/train_lora/qwen25vl_3b_maze_lora_sft_both.yaml
```

仅正确轨迹训练：

```bash
CUDA_VISIBLE_DEVICES=2,5,8,9 llamafactory-cli train \
  examples/train_lora/qwen25vl_3b_maze_lora_sft.yaml
```

训练配置文件（`examples/train_lora/*.yaml`）关键字段：

| 字段 | 说明 |
| --- | --- |
| `dataset_dir` | SFT 数据集目录（相对于 `DMP/`） |
| `dataset` | 训练集名称（对应 `dataset_info.json` 中的 key） |
| `eval_dataset` | 评估集名称 |
| `output_dir` | 检查点保存目录 |
| `lora_rank` | LoRA 秩 |
| `num_train_epochs` | 训练轮数 |

### 步骤 C：逐检查点评估

对训练配置 `output_dir` 下所有 `checkpoint-*` 检查点目录自动推理并评估。脚本会为每个 checkpoint 创建一个同名输出目录，并保存 LLaMA-Factory 生成的 `generated_predictions.jsonl`、指标文件和简要明细文件：

```bash
CUDA_VISIBLE_DEVICES=7 python scripts/eval_maze_checkpoints.py \
  --predict-yaml examples/inference/qwen25vl_3b_maze_lora_predict_both.yaml \
  --checkpoint-root ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_sft_both_50 \
  --output-root ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_checkpoint_eval_both
```

| 参数 | 说明 |
| --- | --- |
| `--predict-yaml` | 推理配置文件路径 |
| `--checkpoint-root` | 含 `checkpoint-*` 子目录的训练输出目录 |
| `--output-root` | 各 checkpoint 评估结果的保存根目录 |
| `--dataset-file` | 可选，显式指定推理所用 SFT 数据集；默认从 `dataset_info.json` 解析 |
| `--skip-predict` | 跳过推理，直接对已有 `generated_predictions.jsonl` 做评估 |
| `--max-reset-rounds` | 每个 checkpoint 内每条 maze 数据失败后的最大 reset/retry 次数；例如 `2` 表示每条数据最多评估 3 轮 |

每个检查点输出目录包含：

```text
checkpoint-XXXX/
├── generated_predictions.jsonl
├── maze_metrics.json
└── maze_details.jsonl
```

评估指标：

| 指标 | 说明 |
| --- | --- |
| `exact_step_match` | step-wise 样本级动作匹配率，仅 step-wise 数据有此指标 |
| `maze_em` | step-wise 迷宫级精确匹配率 |
| `maze_pr` | step-wise 迷宫级前缀正确率（进度率） |
| `maze_by_difficulty` | step-wise 按 Easy/Medium/Hard 分类的指标 |
| `em` | raw-path 完整路径精确匹配率，仅 raw-path 数据有此指标 |
| `pr` | raw-path 完整路径前缀正确率，仅 raw-path 数据有此指标 |
| `by_difficulty` | raw-path 按 Easy/Medium/Hard 分类的指标 |

### 步骤 D：单 checkpoint 评估

对指定 checkpoint 单独推理并评估：

```bash
CUDA_VISIBLE_DEVICES=7 python scripts/eval_maze_checkpoint.py \
  --predict-yaml examples/inference/qwen25vl_3b_maze_lora_predict_both.yaml \
  --checkpoint ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_sft_both_50/checkpoint-3000 \
  --output-dir ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_checkpoint_eval_both/checkpoint-3000
```

如果 `predict-yaml` 中的 `dataset_dir` / `eval_dataset` 无法解析到具体数据文件，可以显式传入：

```bash
CUDA_VISIBLE_DEVICES=7 python scripts/eval_maze_checkpoint.py \
  --predict-yaml examples/inference/qwen25vl_3b_maze_lora_predict_both.yaml \
  --checkpoint ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_sft_both_50/checkpoint-3000 \
  --output-dir ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_checkpoint_eval_both/checkpoint-3000 \
  --dataset-file ../DATA/Training_Data/maze_test_unseen_stepwise_sft_both.json
```

已有 `generated_predictions.jsonl` 时可加 `--skip-predict`，只重新计算指标。

## 端到端快速示例

以下是从零开始生成 `regular` 模式数据并完成训练的完整命令序列：

```bash
# 阶段 1：生成数据
cd DataGeneration/

# 1. 生成规则（LLM）
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 1 \
  --mode regular \
  --num_iterations 5

# 2. 选择训练规则集（每组固定 1 条规则）
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 2 \
  --mode regular \
  --num_rules 20

# 3. 生成验证代码
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 3 \
  --mode regular

# 4. 提取代码文件
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 4 \
  --mode regular

# 5. 生成迷宫池
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 5 \
  --mode regular

# 6. 规则-迷宫匹配（交互式）
python Generate_rule_maze/generate_data_pipeline.py \
  --setting local \
  --state 6 \
  --mode regular

# 阶段 2：训练数据集准备
# 构建训练数据集（通常按顺序执行状态 1~3）
python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state 1 \
  --mode regular

python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state 2 \
  --mode regular

python Training_Dataset_Preparation/Build_Training_Dataset/build_training_dataset.py \
  --setting local \
  --state 3 \
  --mode regular

# 生成轨迹（交互式）
python Training_Dataset_Preparation/Generate_Training_Trajectories/generate_training_trajectories.py \
  --setting local \
  --scene regular

# 阶段 3：格式转换、训练与评估
cd ../DMP/

# 转换 train/test_unseen/test_seen 轨迹，并更新 DATA/Training_Data/dataset_info.json
python scripts/prepare_stage3_datasets.py \
  --setting local \
  --scene regular \
  --split all

# 训练
export HF_ENDPOINT=https://hf-mirror.com
CUDA_VISIBLE_DEVICES=0,1,2,3 llamafactory-cli train \
  examples/train_lora/qwen25vl_3b_maze_lora_sft_both.yaml

# 评估所有检查点
CUDA_VISIBLE_DEVICES=0 python scripts/eval_maze_checkpoints.py \
  --predict-yaml examples/inference/qwen25vl_3b_maze_lora_predict_both.yaml \
  --checkpoint-root ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_sft_both_50 \
  --output-root ../DATA/Training_Result/qwen2.5-vl-3b/lora/maze_checkpoint_eval_both
```

## 路径配置速查

各脚本的路径来源汇总（均通过 `--setting local` 加载 `path_setting/local_setting.yml`）：

| 路径变量 | yml 键 | 用于 |
| --- | --- | --- |
| 项目根目录 | `BASED_DIR` | RuleMaze 仓库根目录 |
| 产物总目录 | `DATA_ROOT_DIR` | 所有生成产物统一保存在 `${BASED_DIR}/${DATA_ROOT_DIR}` |
| 阶段 1 根目录 | `MAZE_GENERATION_DIR` | `${DATA_ROOT}/${MAZE_GENERATION_DIR}`，保存规则、验证代码、迷宫池、匹配结果 |
| 迷宫池目录名 | `MAZE_POOL_DIR` | `${DATA_ROOT}/${MAZE_GENERATION_DIR}/${MAZE_POOL_DIR}/${SCENE_DIR[mode]}` |
| 迷宫尺寸 | `MAZE_SIZE` | 状态 5 默认生成尺寸，也是状态 6/阶段 2 默认读取的 size 目录 |
| 迷宫数量 | `NUM_MAZES` | 状态 5 生成的迷宫总数 |
| 生成进程数 | `NUM_PROCESSES` | 状态 5 并行进程数 |
| 迷宫尺寸目录模板 | `MAZE_SIZE_DIR_TEMPLATE` | 迷宫池 size 子目录；当前为 `maze_size_{maze_size}` |
| 场景目录名 | `SCENE_DIR` | `regular_scene`、`quest_scene` 等场景子目录 |
| 模型根目录 | `MODEL_DIR` | 模型下载或缓存位置 |
| 模型名称 | `MODEL_NAME` | Qwen/CLIP 等模型配置 |
| 规则文件名 | `RULES_SAVED_PATH` | 状态 1 输出文件名 |
| 规则集目录名 | `RULE_SETS_DIR` | 状态 2 选择出的规则集 |
| 规则验证代码目录 | `VALIDATOR_CODE_DIR` | 状态 3/4/6 的验证代码、索引 JSON 和匹配结果 |
| 验证代码子目录 | `VALIDATOR_CODE_DIR_NAME` | 状态 4 提取出的 `.py` 文件目录，验证时从该目录加载代码 |
| 验证代码文件名 | `VALIDATOR_CODE_FILE_NAME` | 每个 rule_set 的 Python 验证文件，验证时执行该文件而不是 JSON 中的代码字段 |
| 迷宫批次文件模板 | `MAZE_BATCH_FILE_TEMPLATE` | 状态 6 读取状态 5 生成的 batch JSON |
| 匹配结果目录模板 | `MATCHED_MAZES_DIR_TEMPLATE` | 状态 6 输出、阶段 2 读取的 matched 根目录；当前为 `matched_mazes_<MAZE_SIZE>` |
| 匹配文件模板 | `MATCHED_MAZES_FILE_TEMPLATE` | 状态 6 输出文件名；当前为 `{file_name}.json` |
| RuleMaze 数据集目录 | `RULEMAZE_DATASET_DIR` | `${DATA_ROOT}/${RULEMAZE_DATASET_DIR}`，保存阶段 2 数据集 |
| 匹配文件前缀 | `MAZE_DATA_PATH` | 阶段 1 写入、阶段 2 读取 matched 文件的 basename |
| 训练/测试分割文件 | `TRAINING_DATASET_REF` | 只配置文件名；代码固定从 `Training_Dataset_Preparation/Build_Training_Dataset/` 读取 |
| raw 数据目录 | `RAW_TRAIN_TEST_DIR_NAME` | 阶段 2 状态 1 输出和状态 2 输入 |
| split/combine 数据目录 | `COMBINE_DATASETS_DIR_NAME` | 阶段 2 状态 2/3 和轨迹生成输入 |
| raw 数据文件名 | `SAVED_RAW_*_DATA_FILE_NAME` | 阶段 2 状态 1 的 train/test raw JSON |
| split 文件模板 | `DATASET_SPLIT_FILE_TEMPLATE` | 阶段 2 状态 2 的 train/test JSON |
| combined 文件名 | `COMBINED_*_DATASET_FILE_NAME` | 阶段 2 状态 3 的 train/seen/unseen 合并 JSON |
| 轨迹目录名 | `TRAJECTORIES_DIR_NAME` | 轨迹生成脚本输出目录 |
| DMP 根目录 | `DMP_DIR` | 阶段 3 转换、训练和评估目录 |
| DMP 数据目录 | `DMP_DATA_DIR` | 阶段 3 SFT 数据集输出目录；当前指向 `${BASED_DIR}/${DATA_ROOT_DIR}/Training_Data` |
| DMP 训练结果目录 | `DMP_TRAINING_RESULT_DIR` | 阶段 3 训练检查点和评估结果目录；当前指向 `${BASED_DIR}/${DATA_ROOT_DIR}/Training_Result` |
| DMP dataset info | `DMP_DATASET_INFO_FILE_NAME` | LLaMA-Factory 数据集注册文件 |
| DMP SFT 文件名 | `DMP_*_SFT_FILE_NAME` | 阶段 3 train/test_seen/test_unseen SFT JSON 的 base 文件名；脚本会按 `--trajectory-source` 等参数追加后缀 |
| DMP dataset name | `DMP_*_DATASET_NAME` | `dataset_info.json` 中注册的 base key；脚本会按 `--trajectory-source` 等参数追加后缀 |
| API 密钥文件 | `APIKEY_PATH` | generate_data_pipeline.py |
