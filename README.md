# COINS
What is a COIN? It's a structure designed for categorising natural speech into a command like structure. COINS is an acronym: Command, Option, Input, Number, String. For example "set a timer for 15 minutes", and "set a 15 minute timer" both are represented as 
```json
{
  'C': 'set',
  'O': 'timer',
  'I': 'minute',
  'N': 15,
  'S': None
}
```

# COINer
A Named Entity Recognition (NER) model for parsing natual speech into a COIN structure


# COINann
An annotation tool for labeling data

<img width="1436" alt="COINann screenshot" src="https://github.com/ZackeryRSmith/COINer/assets/72983221/a1d24820-0240-4695-8267-cd48302e1d1b">
