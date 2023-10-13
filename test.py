import spacy

nlp = spacy.load(r'COINS/')
print("Loaded model")


doc = nlp("Set me a timer for 90 minutes.")
for ent in doc.ents:
    print(ent.label_ + '  ------>   ' + ent.text)
