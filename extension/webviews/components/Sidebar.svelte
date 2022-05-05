<script>
    import { writable } from 'svelte/store';
	import { beforeUpdate, afterUpdate } from 'svelte';

    let innerHeight ;
	let div ;
	let autoscroll;

	beforeUpdate(() => {
		autoscroll = div && (div.offsetHeight + div.scrollTop) > (div.scrollHeight - 20);
	});
	afterUpdate(() => {
		if (autoscroll) div.scrollTo(0, div.scrollHeight);
	});


    let Messages = writable({});
    
    let message ='';
    $Messages = [
            { id : 0, msg : 'This is Cary. How can i help you?', link : 0},
    ];
	
        
    async function Text(){
		if (!message) return;
			
        var l = $Messages.length;
        $Messages[l] = { id: 1, msg : message};
        let res = null
        res = await fetch('https://chatbotapi-se.herokuapp.com/'+message, {
			method: 'POST',
		}).then((x) => x.json());
        while(!res)
            $Messages[l+1] =  { id: 0, msg : "...",  link : 0};
        $Messages[l+1] =  { id: 0, msg : res.result,  link : 0};
        message = '';

    }
    async function Numpy(){
		if (!message) return;
			
        var l = $Messages.length;
        $Messages[l] = { id: 1, msg : message};
        let res = null
        res = await fetch('https://numpy-chatbot.herokuapp.com/'+message, {
			method: 'POST',
		}).then((x) => x.json());
        while(!res)
            $Messages[l+1] =  { id: 0, msg : "...",  link : 0};
        $Messages[l+1] =  { id: 0, msg : res.result,  link : 1};
        message = '';

    }
    async function Pandas(){
		if (!message) return;
			
        var l = $Messages.length;
        $Messages[l] = { id: 1, msg : message};
        let res = null
        res = await fetch('https://pandas-chatbot.herokuapp.com/'+message, {
			method: 'POST',
		}).then((x) => x.json());
        while(!res)
            $Messages[l+1] =  { id: 0, msg : "...", link : 0};
        $Messages[l+1] =  { id: 0, msg : res.result, link : 1};
        message = '';

    }
	
		function handleKeydown(event) {
		if (event.key === 'Enter') {
			const text = event.target.value;
			if (!text) return;
			Text();
		}

	}
	
	
	
    </script>

<svelte:window bind:innerHeight/>
    
    <style>
    .chatbot-heading {
        color: #323f4b;
        font-family: "Roboto";
        font-size: 30px;
    }
    
    .image {
        width: 50px;
			 height : 60px;
    }
    
    .chat-container {
        padding: 10px;
        overflow-y: scroll;
        scroll-behavior:smooth;
        background-color: rgb(179, 238, 238);
        
    }
		.msg-to-chatbot-container {
        text-align: right;
        margin-top: 10px;
        margin-bottom: 10px;
				max-width : 75%;
			  
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
				max-width : 75%;
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
  min-width: 400px;
  height:100vh;

  display:grid;
}
	</style>
			
    </svelte:head>
  <div class="main">
						<nav class="navbar fixed-top navbar-light bg-light">
								<a class="navbar-brand" href="/">Meet our Chatbot</a>
						</nav>						
						<h1 class="text-center chatbot-heading">Meet our Chatbot</h1>


					            <div class="chat-container" id="chatContainer" 	style="height: {innerHeight-145}px;"  bind:this={div}>
												        {#each $Messages as msg}
                {#if msg.id == 0}
									<div class="d-flex flex-row ">
										            <img class="image" alt="" src="https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-bot-img.png" />
										              <div class="msg-from-chatbot-container">
                                                {#if msg.link == 0}
                                                <div class="msg-from-chatbot">
                                                    {msg.msg}
                                                </div>
                                                {:else}
                                                <div class="msg-from-chatbot"  style = "white-space: pre-wrap; white-space: -moz-pre-wrap; white-space: -pre-wrap; white-space: -o-pre-wrap; word-wrap: break-word; ">
                                                    <a href={msg.msg}>{msg.msg}</a>
                                                </div>
                                                {/if}
                                    </div>
							</div> 
                  
                        {:else}
							<div class="d-flex flex-row justify-content-end">
								                         <div class="msg-to-chatbot-container">
                                        <div class="msg-to-chatbot">
                                            {msg.msg}
                                        </div>
                                    </div>
			
                <img class="image"  alt="" src="https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-boy-img.png" />

								
							</div>
   
                {/if}
                        
        {/each}
											</div>

   <div style="background-color: rgb(179, 238, 238);">
    <div>
        <div class="d-flex flex-row justify-content-around">
            <button type="button" class="btn w-50 p-1 m-2 btn-secondary btn-sm " on:click={()=>Numpy()}>Search numpy</button>
            <button type="button" class="btn w-50 p-1 m-2 btn-secondary btn-sm" on:click={()=>Pandas()}>Search pandas</button>
        </div>
      
    </div>

    <div class="msg_box" >
        <div class="d-flex flex-row fixed-bottom ">
            <input class="user-input" id="userInput" bind:value={message} on:keydown={handleKeydown}>
            <button class="send-msg-btn" id="sendMsgBtn" on:click={()=>Text()}>
            <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>
            
   </div>                  
		
		
</div>

