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
				X
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9); /* Darker overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background: #1c1c1c; /* Dark background */
  padding: 20px;
  max-width: 800px;
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.7); /* Subtle shadow */
}

iframe {
  width: 100%;
  height: 450px;
  border: none;
  border-radius: 8px;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff4444; /* Bright red close button */
  color: white;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 5px 10px;
  border-radius: 5px;
  transition: background 0.3s ease;
}

.close-button:hover {
  background: #ff0000; /* Darker red on hover */
}
</style>
