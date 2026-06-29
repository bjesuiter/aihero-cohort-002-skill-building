To run any of the exercises in skill building or the project, you will need to grab an API key from some kind of AI service.

The one I recommend you use is [Gemini](https://aistudio.google.com/api-keys). The reason for that is all you need is a Google account and you can get an API key for free that will allow you to complete the course.

It might get a little bit rate-limited inside the eval section. Since with evals you push through a lot of data in your system and really kind of push it to its limits.

But even if you add your credit card, it's really not going to charge you much, especially if you stick to Gemini 2.5 Flash.

**However, you really can use any kind of model you like.** If you already have access to Anthropic, OpenAI, or some other kind of model provider that will work absolutely fine with this course.

And because we're using the [AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers), you can just plug it in.

## A Word of Caution About Local Models

One thing I would urge you to be cautious about, though, is using local models. Unless you're really experienced with local models and you've got a piece of hardware that can run them really effectively, then you might not find they perform particularly well with the course.

## Setting Up Your API Key

Once you've got your API key, add it to your local Varlock config in both the skill building and project repos since they both use AI. The committed `.env.schema` files document the required variable names; real env files stay gitignored.

### For Gemini

First, [get your Gemini API key](https://aistudio.google.com/api-keys).

The committed `.env.jb` file contains the resolver ref for this local
dev secret:

```
GOOGLE_GENERATIVE_AI_API_KEY=keychain(service="varlock", account="aihero-cohort-002-skill-building:jb:GOOGLE_GENERATIVE_AI_API_KEY")
```

Create the Keychain item with service `varlock`, account
`aihero-cohort-002-skill-building:jb:GOOGLE_GENERATIVE_AI_API_KEY`,
and add the repo path as a comment/label when your Keychain tool
supports it:
`/Users/bjesuiter/Develop/bjesuiter/aihero-cohort-002-skill-building`.
Varlock's current Keychain resolver can look up by service and
account, but it cannot set comment/label metadata or custom picker
heading/title/supporting text from `.env.jb`. If the native picker
heading only shows the exported env var name, use the selectable item's
scoped service/account to confirm this is the local dev secret for this
repo before selecting it.
The default local scripts select the `jb` profile inline with
`DEV_ENV=jb`, so no `.env.local` selector is needed. Run
`pnpm env:load` to verify Varlock can resolve it.

### For Other Providers

If you're using a different provider like Anthropic or OpenAI:

1. Check the [AI SDK providers documentation](https://ai-sdk.dev/providers/ai-sdk-providers) for your specific provider
2. Install the required provider package from the AI SDK
3. Use the matching resolver ref in `.env.jb` with the same `keychain(service="varlock", account="aihero-cohort-002-skill-building:jb:<ENV_VAR_NAME>")` pattern
4. Do a find and replace with any of the Google models that I've used and replace it with your own

```
google('gemini-2.5-flash') -> openai('gpt-4.1-mini')
```

So once Varlock can resolve at least one model provider key, you are good to go.

Nice work, and I will see you in the next one.
