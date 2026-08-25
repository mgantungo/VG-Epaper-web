<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from '#imports';
import { NuxtLink } from '#components';
import { useAccountStore } from '~/stores/account';

const route = useRoute();
const router = useRouter();
const account = useAccountStore();

const username = ref('');
const email = ref('');
const password = ref('');
const submitting = ref(false);
const error = ref(null);

async function submit() {
  submitting.value = true;
  error.value = null;
  try {
    await account.register(username.value, email.value, password.value);
    const redirect = route.query.redirect || '/';
    router.push(redirect);
  } catch (e) {
    error.value = e?.data?.error || 'Could not create your account. Try a different email or username.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
    <div class="w-full max-w-sm bg-white text-neutral-900 rounded-xl p-8 shadow-2xl">
      <h1 class="font-serif font-extrabold text-2xl mb-1">Create your account</h1>
      <p class="text-sm text-neutral-500 mb-6">Free to create — subscribing comes after.</p>

      <form @submit.prevent="submit" class="space-y-4">
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Username</span>
          <input
            v-model="username" type="text" required autocomplete="username"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Email</span>
          <input
            v-model="email" type="email" required autocomplete="email"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Password</span>
          <input
            v-model="password" type="password" required autocomplete="new-password" minlength="6"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>

        <p v-if="error" class="text-red-600 text-xs">{{ error }}</p>

        <button
          type="submit" :disabled="submitting"
          class="w-full bg-neutral-900 text-white rounded-lg py-2.5 font-mono text-sm disabled:opacity-60"
        >{{ submitting ? 'Creating account…' : 'Create account' }}</button>
      </form>

      <p class="text-xs text-neutral-500 mt-6 text-center">
        Already have an account?
        <NuxtLink :to="{ path: '/login', query: route.query }" class="text-neutral-900 underline">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>