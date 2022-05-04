file1 = open('myfile.txt', 'r')
Lines = file1.readlines()
str = ""
file1 = open('myfile.txt', 'r')
count = 0
 
while True:
    count += 1
 
    # Get next line from file
    line = file1.readline()
 
    # if line is empty
    # end of file is reached
    if not line:
        break
    str = str + line
file1.close()
print(str)