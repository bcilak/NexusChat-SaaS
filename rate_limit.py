"""Paylaşılan rate limiter örneği.

slowapi'nin doğru çalışması için, endpoint'leri süsleyen limiter ile
app.state.limiter AYNI örnek olmalı. Bu modül tek bir örnek sağlar; hem
main.py hem de router'lar buradan import eder.
"""
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMITING_ENABLED = True
except ImportError:  # slowapi kurulu değilse rate-limit devre dışı
    limiter = None
    RATE_LIMITING_ENABLED = False


def rate_limit(limit_str: str):
    """Endpoint'e hız sınırı uygular; slowapi yoksa no-op döner."""
    def decorator(func):
        if RATE_LIMITING_ENABLED and limiter is not None:
            return limiter.limit(limit_str)(func)
        return func
    return decorator
