<script>
    import { writable } from 'svelte/store';
    let Messages = writable({});
    
      let message ='';
    $Messages = [
        { id : 0, msg : 'This is BotPy. How can i help you?'}
      ];
      
    function Text(){
      var l = $Messages.length;
      $Messages[l] = { id: 1, msg : message};
      $Messages[l+1] =  { id: 0, msg : 'still in development mode'};
      message = '';
    }
    </script>

    
    <style>
    @import url("https://fonts.googleapis.com/css2?family=Bree+Serif&family=Caveat:wght@400;700&family=Lobster&family=Monoton&family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display+SC:ital,wght@0,400;0,700;1,700&family=Playfair+Display:ital,wght@0,400;0,700;1,700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Source+Sans+Pro:ital,wght@0,400;0,700;1,700&family=Work+Sans:ital,wght@0,400;0,700;1,700&display=swap");
    
    .chatbot-heading {
        color: #323f4b;
        font-family: "Roboto";
        font-size: 30px;
    }
    
    .image {
        width: 150px;
    }
    
    .chat-container {
        padding: 10px;
    }
    
    .msg-to-chatbot-container {
        text-align: right;
        margin-top: 10px;
        margin-bottom: 10px;
    }
    
    .msg-to-chatbot {
        background-color: #cbd2d9;
        font-family: "Roboto";
        font-weight: 900;
        border-radius: 16px;
        padding: 10px;
    }
    
    .msg-from-chatbot-container {
        margin-top: 10px;
        margin-bottom: 10px;
    }
    
    .msg-from-chatbot {
        color: white;
        background-color: #e57742;
        font-family: "Roboto";
        font-weight: 900;
        border-radius: 16px;
        padding: 10px;
    }
    
    .user-input {
        background-color: #cbd2d9;
        font-family: "Roboto";
        font-weight: 900;
        height: 52px;
        border-width: 0;
        border-radius: 5px;
        margin: 8px;
        padding: 15px;
    }
    
    .send-msg-btn {
        background-color: #cbd2d9;
        font-family: "Roboto";
        height: 52px;
        border-width: 0;
        border-radius: 10px;
        margin: 8px;
        padding-left: 25px;
        padding-right: 25px;
    }
    </style>
    
    
    
        <div class="p-2">
            <h1 class="text-center chatbot-heading">Meet our Chatbot</h1>
            <img class="image" alt="" src="https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-bot-img.png" />
            <div class="chat-container" id="chatContainer">
      {#each $Messages as msg}
          {#if msg.id == 0}
                  <div class="msg-from-chatbot-container">
                      <span class="msg-from-chatbot">
                        {msg.msg}
                      </span>
                    </div>
              {:else}
                <div class="msg-to-chatbot-container">
                      <span class="msg-to-chatbot">
                        {msg.msg}
                      </span>
                    </div>
          {/if}
              
      {/each}
                    
    
          
          </div>
            <div class="d-flex flex-row justify-content-end">
                <img class="image"  alt="" src="https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-boy-img.png" />
            </div>
    
            <div class="d-flex flex-row justify-content-center fixed-bottom">
                <input class="user-input" id="userInput" bind:value={message}/>
                <button class="send-msg-btn" id="sendMsgBtn" on:click={()=>Text()}>
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>