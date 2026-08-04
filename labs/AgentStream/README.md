<div align="center">

<h1>AgentStream: How Well Do Self-Evolving LLM Agents Perform Under Streaming Tasks?</h1>

<p>
  Dong Yan<sup>1,2,3</sup>,
  Jian Liang<sup>1,3†</sup>,
  Dapeng Hu<sup>2†</sup>,
  Ran He<sup>1,3</sup>,
  Nicholas Jing Yuan<sup>2</sup>,
  Qi Zhang<sup>2</sup>,
  Tieniu Tan<sup>1,3,4</sup>
</p>

<p>
  <sup>1</sup>School of Artificial Intelligence, University of Chinese Academy of Sciences<br>
  <sup>2</sup>Microsoft<br>
  <sup>3</sup>Institute of Automation, Chinese Academy of Sciences<br>
  <sup>4</sup>Nanjing University
</p>

<p>
  📧 <code>liangjian92@gmail.com</code> &nbsp;
  <code>dapenghu@microsoft.com</code>
</p>

</div>

## 🚀 News
* **[2026/07]** Code is under preparation. Stay tuned!

## 📖 Overview
Large language model (LLM) agents can self-evolve by continually improving from their own accumulated experience.
However, existing studies predominantly adopt independent evaluation.
Consequently, the behavior of self-evolving agents in realistic streaming settings, where agents adapt to diverse and complex task streams, remains poorly understood.
To address this gap, we introduce AgentStream, a unified framework that evaluates self-evolving agents spanning diverse evolution components by organizing agentic benchmarks into a configurable task stream and instantiating the `Isolated`, `Sequential`, and `Interleaved` streaming scenarios at test time, which progressively vary the scope and domain composition of the stream.
Over these scenarios, we combinatorially evaluate five representative self-evolving methods across three frontier foundation models, disentangling how model capability, method architecture, and streaming scenario jointly shape self-evolution.
Our results show that self-evolution reliability varies across streaming scenarios, the benefit of self-evolution is gated by model capability and non-monotonic in model strength, and no single method dominates across models and scenarios.
These findings offer concrete guidance for selecting self-evolving methods across models and streaming scenarios.
Overall, we advocate that self-evolving agents should be evaluated under realistic task streams rather than isolated single-task settings.
