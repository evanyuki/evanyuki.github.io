<script lang="ts">
  import { login } from "../utils/auth-utils";
  import type { LoginRequest } from "../types/auth";
  import { loginModal } from "../stores/loginModal";

  // 使用 Svelte 的自动订阅语法
  $: isOpen = $loginModal.isOpen;
  $: onLoginSuccess = $loginModal.onLoginSuccess;

  let userName = "";
  let password = "";
  let isLoading = false;
  let error: string | null = null;

  async function handleLogin() {
    if (!userName || !password) {
      error = "请输入用户名和密码";
      return;
    }

    isLoading = true;
    error = null;

    try {
      const credentials: LoginRequest = {
        username: userName.trim(),
        password: password,
      };

      await login(credentials);

      // 登录成功
      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // 关闭弹窗
      closeModal();
    } catch (err) {
      error = err instanceof Error ? err.message : "登录失败，请重试";
    } finally {
      isLoading = false;
    }
  }

  function closeModal() {
    loginModal.close();
    userName = "";
    password = "";
    error = null;
  }

  // 处理关闭模态框的键盘事件（Escape、Enter、Space）
  function handleKeydownForClose(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeModal();
    }
  }

  // 处理全局键盘事件（窗口级别）
  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      closeModal();
    } else if (event.key === "Enter" && !isLoading) {
      handleLogin();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="modal-overlay"
    on:click={closeModal}
    on:keydown={handleKeydownForClose}
    role="button"
    tabindex="-1"
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="login-title" class="modal-title">登录</h2>
        <button
          class="modal-close"
          on:click={closeModal}
          on:keydown={handleKeydownForClose}
          aria-label="关闭"
          type="button"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        {#if error}
          <div class="error-message">
            {error}
          </div>
        {/if}

        <form on:submit|preventDefault={handleLogin}>
          <div class="form-group">
            <label for="userName">用户名</label>
            <input
              id="userName"
              type="text"
              bind:value={userName}
              placeholder="请输入用户名"
              disabled={isLoading}
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="password">密码</label>
            <input
              id="password"
              type="password"
              bind:value={password}
              placeholder="请输入密码"
              disabled={isLoading}
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="login-button" disabled={isLoading}>
            {#if isLoading}
              <span class="loading-spinner"></span>
              <span>登录中...</span>
            {:else}
              登录
            {/if}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: var(--card-bg, #fff);
    border-radius: 0.75rem;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    animation: modalFadeIn 0.2s ease-out;
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-90, #111);
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-50, #999);
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }

  .modal-close:hover {
    background-color: var(--bg-secondary, #f3f4f6);
    color: var(--text-90, #111);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-75, #333);
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
    background: var(--bg-primary, #fff);
    color: var(--text-90, #111);
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.75rem;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .login-button {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--primary, #6366f1);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .login-button:hover:not(:disabled) {
    background-color: var(--primary-hover, #4f46e5);
  }

  .login-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
