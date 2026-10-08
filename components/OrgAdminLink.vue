<!--
  Repo path: apps/web/components/OrgAdminLink.vue  (srcDir-relative)   NEW FILE

  "Manage organisation" link that renders ONLY for Organisation Admins.
  Drop it into the header / account menu:

    import OrgAdminLink from '~/components/OrgAdminLink.vue';
    <OrgAdminLink class="..." />

  It asks /api/account/me once per page load (shared through useState, so
  several instances or re-renders don't repeat the call) and renders
  nothing for signed-out readers, ordinary members and personal accounts.
-->
<script setup>
import { onMounted } from 'vue';
import { useState, useCookie } from '#imports';
import { NuxtLink } from '#components';
import { useEpaperApi } from '~/composables/useEpaperApi';

const role = useState('epaper-org-role', () => null); // null = unknown, '' = not an admin
const orgName = useState('epaper-org-name', () => '');

onMounted(async () => {
  if (role.value !== null) return;
  if (!useCookie('token').value) { role.value = ''; return; }
  try {
    const me = await useEpaperApi().getAccount();
    const org = me?.organisation;
    role.value = org && org.status === 'active' ? org.role : '';
    orgName.value = org?.name || '';
  } catch {
    role.value = '';
  }
});
</script>

<template>
  <NuxtLink v-if="role === 'admin'" to="/organisation" :title="orgName ? `Manage ${orgName}` : 'Manage organisation'">
    <slot>Manage organisation</slot>
  </NuxtLink>
</template>
