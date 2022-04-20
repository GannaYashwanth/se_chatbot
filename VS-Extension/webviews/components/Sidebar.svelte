<script>
    import { writable } from 'svelte/store';
    let Messages = writable({});
    
        let message ='';
    $Messages = [
            { id : 0, msg : 'This is BotPy. How can i help you?'},
            { id : 1, msg : 'Good Morning !'},
            { id : 0, msg : 'Good Morning !!'},
            { id : 1, msg : 'Welcome ..'},
			         { id : 0, msg : 'I Know you are a good developer'},
            { id : 1, msg : 'Ohh !'},
            { id : 1, msg : 'Bye !!'},
            { id : 0, msg : 'See you soon !'},
        ];
	
        
    function Text(){
        var l = $Messages.length;
        $Messages[l] = { id: 1, msg : message};
        $Messages[l+1] =  { id: 0, msg : 'still in development mode'};
        message = '';
		
 
    
    }
    </script>
    
    <style>
    .chatbot-heading {
        color: #323f4b;
        font-family: "Roboto";
        font-size: 30px;
    }
    
    .image {
        width: 50px;
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
				width : 100%;
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
		.navbar {
        display: block;
        text-align:center;
        float: none;
}

    </style>
    
    <svelte:head>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous" />
        <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV" crossorigin="anonymous"></script>
        <script src="https://kit.fontawesome.com/5f59ca6ad3.js" crossorigin="anonymous"></script>
			
			<style>
	
	    ::-webkit-scrollbar{
  		width:0;
		}
    *{
        margin:0;
        padding:0;
        box-sizing:border-box;
    }
			body{
  width:100vw;
  min-width: 500px;
  height:100vh;

  display:grid;
}
	</style>
			
    </svelte:head>
  <div class="main">
						<nav class="navbar fixed-top navbar-light bg-light">
								<a class="navbar-brand" href="/">Meet our Chatbot</a>
						</nav>

        <div class="p-2">

            <h1 class="text-center chatbot-heading">Meet our Chatbot</h1>

            <div class="chat-container" id="chatContainer">
        {#each $Messages as msg}
                {#if msg.id == 0}
									<div class="d-flex flex-row ">
										            <img class="image" alt="" src="https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-bot-img.png" />
										              <div class="msg-from-chatbot-container">
                                        <span class="msg-from-chatbot">
                                            {msg.msg}
                                        </span>
                                    </div>
							</div>
                  
                        {:else}
							<div class="d-flex flex-row justify-content-end">
								                         <div class="msg-to-chatbot-container">
                                        <span class="msg-to-chatbot">
                                            {msg.msg}
                                        </span>
                                    </div>
			
                <img class="image"  alt="" src="https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-boy-img.png" />

								
							</div>
   
                {/if}
                        
        {/each}
        <div class="msg_box">
            <div class="d-flex flex-row justify-content-center fixed-bottom">
                <input class="user-input" id="userInput" bind:value={message}/>
                <button class="send-msg-btn" id="sendMsgBtn" on:click={()=>Text()}>
                <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
                                    
    
                
                </div>
           

    
  
		</div>




		
</div>

