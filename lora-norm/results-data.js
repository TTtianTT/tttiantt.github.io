const results = {
  qwen:[
    {task:'Magicoder',gain:10.37,benchmark:'HumanEval · greedy pass@1',target:[64.23,74.59],targetSD:[1.27,.35],off:[78.04,81.26],offSD:[.45,.07],fg:[1.67,0],fgSD:[.48,0]},
    {task:'MetaMath',benchmark:'GSM8K · strict accuracy',target:[84.05,87.47],targetSD:[.09,.68],off:[68.16,75.28],offSD:[4.10,1.23],fg:[4.95,0],fgSD:[4.05,0]},
    {task:'Tulu',benchmark:'IFEval · prompt-level strict',target:[66.97,71.41],targetSD:[.83,.91],off:[85.63,84.93],offSD:[.46,.44],fg:[0,0],fgSD:[0,0]}
  ],
  llama:[
    {task:'Magicoder',benchmark:'HumanEval · greedy pass@1',target:[54.47,54.67],targetSD:[1.41,.93],off:[61.20,65.80],offSD:[1.03,.92],fg:[4.60,1.29],fgSD:[.52,.35]},
    {task:'MetaMath',benchmark:'GSM8K · strict accuracy',target:[75.54,79.35],targetSD:[1.39,1.18],off:[58.59,62.71],offSD:[.93,.55],fg:[4.07,.67],fgSD:[.68,.89]},
    {task:'Tulu',benchmark:'IFEval · prompt-level strict',target:[62.72,65.00],targetSD:[.56,.21],off:[65.70,66.77],offSD:[1.87,.80],fg:[.97,.11],fgSD:[.95,.19]}
  ]
};
