

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def search_stackoverflow(query):
    
    PATH = "C:\Program Files (x86)\chromedriver.exe"
    driver = webdriver.Chrome(PATH)

    driver.get("https://google.com")
    try:
        google_search_box = WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.NAME, "q"))
        )
    except:
        print('There was an error while scraping...')
        return
    finally:
        pass
    google_search_box.clear()
    google_search_box.click()
    google_search_box.send_keys(query)
    google_search_box.send_keys(Keys.ENTER)
    
    try:
        WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CLASS_NAME, 'yuRUbf'))
        ).click()
    except:
        print('There was an error while scraping...')
        return
    finally:
        pass
    
    try:
        heading = WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.ID, 'question-header'))
        )
    except:
        print('There was an error while scraping...')
        return
    finally:
        pass
    
    heading = heading.text
    heading = heading.split('\n')[0]
    #print(heading)
    #print()
    
    answers = driver.find_elements(by=By.CLASS_NAME, value='js-post-body')
    final_answers = []
    
    for answer in answers[1:]:
        final_answers.append(answer.get_attribute('outerHTML').replace('\n', ''))
        
    vote_bar = driver.find_elements(by=By.CLASS_NAME, value='js-voting-container')
    votes=[]
    
    for vote in vote_bar:
        each_vote = []
        each_vote.append(int(vote.find_element(by=By.CLASS_NAME, value='js-vote-count').text))
        try:
            vote.find_element(by=By.CSS_SELECTOR, value='div.js-accepted-answer-indicator.d-none')
            #print('not found')
            each_vote.append(0)
        except:
            #print('found')
            each_vote.append(1)
    
        votes.append(each_vote)
    
    #print(votes)
    #print()
    
    idx = -1
    
    i=0
    for vote in votes[1:]:
        if vote[1] == 1 and idx==-1:
            idx = i
        elif vote[1] == 1 and votes[idx][0] > vote[0]:
            idx = i

        i = i + 1
        
    question = answers[0].get_attribute('outerHTML')
    
    question = question.replace('\n', '')
    
    if idx==-1:
        answer = "Couldn't find an accepted answer..."
    else:
        answer = final_answers[idx]
        
    driver.close()
    
    return( {
        'heading': heading,
        'question': question,
        'answer': answer
    })



result = search_stackoverflow("how to use selenium in python stackoverflow")
