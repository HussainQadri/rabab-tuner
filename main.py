from src.tuner_core import RababString

rabab_strings = [
    RababString("Sa", 261.63),
    RababString("Re", 293.66),
    RababString("Ga", 329.63),
    RababString("Ma", 349.23),
    RababString("Pa", 392.00),
    RababString("Dha", 440.00),
    RababString("Ni", 493.88),
    RababString("Sa (upper)", 523.25)
]


string_name = input("What string would you like to tune (e.g., Sa, Re, Ga): ").strip()


matched = ""
for string in rabab_strings:
    if string.note.lower() == string_name.lower():
        matched = string
        break

if matched:
    status = matched.tuning_status()
    print(f"{matched.note} string is {status}")
else:
    print("Invalid string name")
