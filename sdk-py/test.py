from iglobals_auth import IGlobalsAuth, generate_pkce

def main():
    ica = IGlobalsAuth(
        client_id='test_client',
        redirect_uri='http://localhost/callback',
        base_url='http://localhost:3000'
    )
    pkce = generate_pkce()
    print("PKCE Verifier:", pkce['code_verifier'])
    print("PKCE Challenge:", pkce['code_challenge'])
    
    url = ica.get_authorization_url(state='xyz123', code_challenge=pkce['code_challenge'])
    print("Auth URL:", url)

if __name__ == '__main__':
    main()
