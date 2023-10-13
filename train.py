from __future__ import unicode_literals, print_function

import random
from pathlib import Path
import spacy
from tqdm import tqdm
from spacy.training.example import Example
import pickle

import os
import re


def parse_annotations(path: str) -> list[tuple[str, dict], ...]:
    path = os.path.abspath(path)
    if not os.path.exists(path):
        ValueError("file does not exist!")

    training_data = []

    tag_re = r'\[(.*?)\]\((.*?)\)'

    with open(path, 'r') as f:
        lines = f.readlines()

        for line in lines:
            if line.startswith(('--', '\n')):
                continue

            raw_line = re.sub(tag_re, r'\1', line).strip()

            entities = []
            start = 0

            for match in re.finditer(tag_re, line):
                text = match.group(1)
                label = match.group(2)

                start_index = raw_line.find(text, start)
                end_index = start_index + len(text)
                start = end_index

                entities.append((start_index, end_index, label))

            training_data.append((raw_line, {'entities': entities}))

    return training_data


TRAIN_DATA = parse_annotations('annot.txt')

output_dir = Path("COINS/")
n_iter = 100

# create a blank model
nlp = spacy.blank('en')
print("Created blank 'en' model")

# set up the pipeline
if 'ner' not in nlp.pipe_names:
    ner = nlp.create_pipe('ner')
    nlp.add_pipe('ner', last=True)
else:
    ner = nlp.get_pipe('ner')

# adding labels to ner
for _, annotations in TRAIN_DATA:
    for ent in annotations.get('entities'):
        ner.add_label(ent[2])
example = []
other_pipes = [pipe for pipe in nlp.pipe_names if pipe != 'ner']
with nlp.disable_pipes(*other_pipes):  # only train NER
    optimizer = nlp.begin_training()
    for itn in range(n_iter):
        random.shuffle(TRAIN_DATA)
        losses = {}
        for text, annotations in tqdm(TRAIN_DATA):
            doc = nlp.make_doc(text)
            example = Example.from_dict(doc, annotations)
            nlp.update(
                [example],
                drop=0.5,
                sgd=optimizer,
                losses=losses)
        print(losses)

# output to file
if output_dir is not None:
    output_dir = Path(output_dir)
    if not output_dir.exists():
        output_dir.mkdir()
    nlp.to_disk(output_dir)
    print("Saved model to", output_dir)
pickle.dump(nlp, open("coins.pkl", "wb"))
