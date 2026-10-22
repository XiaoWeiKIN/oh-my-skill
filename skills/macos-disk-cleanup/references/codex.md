# Codex 专项检查与清理

## 定位与授权

先区分 CLI 状态目录、桌面应用数据、浏览器数据和更新器目录。CLI 根目录采用当前环境的 `${CODEX_HOME:-$HOME/.codex}`；桌面路径不由 CODEX_HOME 推导。下列路径是 macOS 上已观察到的定位线索，版本可能改变，必须核验实际存在、归属和用途。

“补全 skill”只修改技能文件，不授权执行清理。“清理 Codex 缓存”不包含会话、附件、用户配置或整个应用目录。用户之前要求保留的更新缓存等项目继续排除，除非明确改变要求。

先扫描每个候选的大小和文件类型，记录应用与更新器的运行状态；只读元数据，不输出认证文件、会话正文或完整日志。通过实际运行应用路径及其 `Contents/Info.plist` 识别 bundle ID、版本和构建号，不假定应用一定安装于 `/Applications`。后续按类别逐项判断，不提供通配删除整个根目录的命令。

## 日志

定位线索：

- `<CODEX_HOME>/log/`，例如 `codex-tui.log`。
- `~/Library/Logs/com.openai.codex/` 下的日期分层日志。
- Logs 下独立的 Codex watchdog／keep-awake 日志可能来自本地自建服务，需确认写入者，不能当作官方应用文件直接处理。

列出大文件、修改时间，并用定向 `lsof` 核验持有进程。已授权清理日志时，可删除关闭的旧日志；正在写入的普通文本日志可按 [files.md](files.md) 中的原地截断规则处理，保留 inode。发现日志迅速增长，报告具体服务及增长量，停止服务需要相应授权。

`logs_*.sqlite` 即使名称含 logs，也属于数据库；不按文本日志截断，不单独删除 `-wal`、`-shm`，不对运行中的数据库执行临时 SQL／VACUUM。没有受支持的维护方式时保留并报告占用。日志清理后检查目标是否重新增长，并解释删除已打开文件与截断的区别。

## 缓存

| 定位线索 | 核实后的处理边界 |
| --- | --- |
| `~/Library/Application Support/Codex/` 中的 `Cache`、`Code Cache`、`GPUCache`、`ShaderCache`、`GrShaderCache`、Dawn 相关缓存 | 确认是可重建的渲染／网络缓存，再按精确子目录处理；名字不在此表中的目录继续核实。 |
| `~/Library/Caches/Codex/` 的 `Default`、`codex-browser-app` 等 | 可能包含浏览器 profile 层级，只深入已确认的缓存叶子，不能删除整个 profile。 |
| `~/Library/Caches/com.openai.codex/` 的 `fsCachedData`、`Cache.db` | 可能是系统网络缓存，优先使用应用支持的清理入口；手动清理仅在相关进程已退出、确认该缓存可重建时整体一致地处理，不能单删 SQLite sidecar。 |
| `<CODEX_HOME>/cache/` 中目录与工具元数据缓存 | 逐项确认是可重新获取的元数据；本地独有内容、正在使用的项保留。清理可能触发重新发现或联网下载。 |
| Crashpad／sentry 等诊断目录 | 只把已确认的旧崩溃报告、上传完成的诊断文件列为候选；排查故障所需记录、运行状态和待处理文件单独判断。 |

不得把 `Local Storage`、`Session Storage`、`IndexedDB`、`Cookies`、`Preferences`、`Local State`、`Default`、`Partitions`、`blob_storage`、`artifact-sessions` 整体当缓存删除。它们可能保存登录状态、未保存编辑、页面数据和成果。

应用运行中优先处理已关闭的旧日志，缓存目录留待正常退出后处理。如果当前 Codex 正在执行本任务，不自行退出或杀死它及其 helper；记录需退出后处理的精确目录，交给用户在退出后执行或在独立会话继续。不要用“先删目录、应用自己重建”处理活动数据库或 profile。

`<CODEX_HOME>/plugins/cache` 不一定只是可丢弃的下载缓存，可能是已安装插件当前执行的源码；`vendor_imports`、执行器运行时同样可能是活动依赖。通过插件管理能力核对已安装／启用版本和引用；只有确认未引用的旧版本或下载临时包且已授权时才清理，不手工删除全部插件缓存。

## 更新包

macOS 定位线索：`~/Library/Caches/com.openai.codex/org.sparkle-project.Sparkle/`，可能包含 `PersistentDownloads`、`Installation`、`Launcher`。其他版本按实际 bundle ID、更新框架和文件结构定位，不能假定所有目录都是安装包。

1. 对照实际运行的应用版本与构建号，查看下载包、解包 app 的元数据和修改时间；文件名或时间只能提供线索。
2. 区分已安装旧版本的残留包、重复的当前版本安装包、尚未安装的新版本、下载未完成的包，以及更新器运行文件。
3. 用户授权清理旧更新包后，只处理确认已完成／废弃且无更新器使用的具体包。待安装更新、正在下载／解包／替换的项目保留；不能因年龄较老或没有 lsof 命中就认定更新已结束。
4. 不删除运行中的 `.app`、更新器 helper、Launcher 或 Installation 整个目录；若无法确认生命周期，保留该项并说明需要退出应用／等待更新完成。

不要为了磁盘检查触发下载、安装、重启或取消更新。需要更新状态时使用可用的只读应用检查能力；仅依赖本地元数据无法确认时明确标记未知。不要承诺删除更新包一定能自动恢复。

## 会话、成果和 worktree

优先使用当前可用的应用管理接口，区分归档 transcript、活动会话、UI 元数据和远端数据。

用户明确授权删除归档会话时，只处理已确认归档的本地记录；若只能删除 `archived_sessions` 内容，说明这不等于删除 UI 元数据或云端会话。不直接修改 SQLite 绕过缺失的产品功能。

普通日志／缓存清理默认保留：`sessions`、`archived_sessions`、`history.jsonl`、索引、所有状态数据库及 sidecar、`auth.json`、`config.toml`、skills、rules、memories、automations，以及 attachments、generated_images、visualizations 等用户成果。`.tmp`、`tmp`、备份和快照也需分类，不凭名称整体删除。

托管 worktree 使用应用的归档能力保存恢复快照，先确认需要的忽略文件已保留；不直接 rm。归档 worktree 是可恢复操作，不能报告为永久删除全部占用。

## 完成核验

按日志、缓存、更新包、明确授权的会话分别报告实际处理路径与跳过原因。复查保留文件仍存在、同一数据卷的可用空间变化；应用再次打开后如有授权再验证会话和登录状态，不靠主动重启完成核验。缓存重建和后台日志增长会抵消部分空间收益，应按测量结果解释。
