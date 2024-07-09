import openai

from src.util.secrets import get_azure_open_ai_key

client = openai.AsyncAzureOpenAI(
    azure_endpoint="https://gpt4kloaust.openai.azure.com/",
    api_key=get_azure_open_ai_key(),
    api_version="2024-02-15-preview",
)
