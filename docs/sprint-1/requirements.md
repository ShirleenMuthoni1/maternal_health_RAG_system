# Functional and Non-functional requirements
## Functional requirements
i) The system should allow expectant mothers to register and log in to the system using their email address.<br> 

ii) The system should allow expectant mothers to fill in their context information which includes their location, gestational period, symptoms and medical history so that the system can generate context aware maternal health responses.<br>

iii)	The system should allow expectant mothers to submit maternal health questions through the user interface and receive context aware responses.<br> 

iv)	The system should retrieve relevant maternal health document chunks from the FAISS vector database based on the mother’s query vector, to ensure that retrieved document chunks are relevant to the mother’s submitted question and context information.<br>

v)	The system should generate context aware maternal health responses using an open-source large language model by combining the retrieved document chunks with the mother’s question and context information.<br>

vi)	The system should scan the expectant mother’s submitted question for high risk danger signs such as severe headaches, convulsions and heavy bleeding, and should override the response with an immediate medical alert, advising them to seek medical assistance.

## Non functional requirements
i)	The system should be designed with a simple user interface that can be understood by various expectant mothers.<br>

ii)	The system should be designed in a way that the knowledge base can be updated with new maternal health documents since health information is constantly changing, requiring change to the stored knowledge base code written in google colab.<br>

iii)	The system should detect danger signs and respond with a danger sign alert within ten seconds of question submission, ensuring speed of danger sign detection given that the situation is an emergency.<br>

iv)	The system should be reliable in a way that it is available to expectant mothers, twenty four hours a day to ensure that they can access at any time of the day.<br>

v)	The system should ensure that all data submitted by the expectant mother for example her symptoms, medical history, gestational period and location follows the data protection act.<br>
