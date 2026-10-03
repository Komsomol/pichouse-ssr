<template>
	<div
		v-if="show"
		class="modal-overlay"
		@click="closeModal"
	>
		<div
			class="modal-content"
			@click.stop
		>
			<button
				class="close-button"
				@click="closeModal"
			>
				Close
			</button>
			<iframe
				:src="videoUrl"
				frameborder="0"
				allow="autoplay; encrypted-media"
				allowfullscreen
			/>
		</div>
	</div>
</template>

<script setup>
import { ref, watch } from 'vue';

// Props for controlling the modal
const props = defineProps({
	show: {
		type: Boolean,
		default: false,
	},
	videoKey: {
		type: String,
		default: '',
	},
});

// Emit event to close the modal
const emit = defineEmits(['close']);

// Construct the YouTube URL
const videoUrl = ref(`https://www.youtube.com/embed/${props.videoKey}?autoplay=1`);

const closeModal = () => {
	emit('close');
};

// Watch for changes in videoKey and update the URL
watch(() => props.videoKey, (newKey) => {
	videoUrl.value = `https://www.youtube.com/embed/${newKey}?autoplay=1`;
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  padding: var(--space-md, 1rem);
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 960px;
  padding-top: 52px;
}

iframe {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  border: none;
  background: #000;
}

/* Lightbox-coloured on black, like the screen itself */
.close-button {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 44px;
  min-height: 44px;
  padding: 0 var(--space-md, 1rem);
  background: #eef0ea;
  color: #000;
  border: none;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: var(--font-sm, 0.875rem);
  font-weight: 600;
  cursor: pointer;
}

.close-button:hover {
  background: #fff;
}

.close-button:focus-visible {
  outline: 2px solid #2fd07a;
  outline-offset: 2px;
}
</style>
