class ICAError(Exception):
    def __init__(self, error: str, error_description: str, status: int = None):
        super().__init__(f"{error}: {error_description}")
        self.error = error
        self.error_description = error_description
        self.status = status
